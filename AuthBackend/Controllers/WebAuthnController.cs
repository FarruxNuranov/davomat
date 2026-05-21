using System.Security.Claims;
using System.Text;
using AuthBackend.Data;
using AuthBackend.DTOs;
using AuthBackend.Models;
using AuthBackend.Services;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace AuthBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WebAuthnController : ControllerBase
{
    private readonly IFido2 _fido2;
    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly ITokenService _tokens;

    public WebAuthnController(IFido2 fido2, AppDbContext db, IMemoryCache cache, ITokenService tokens)
    {
        _fido2 = fido2;
        _db = db;
        _cache = cache;
        _tokens = tokens;
    }

    private int? CurrentUserId =>
        int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value, out var id)
            ? id
            : null;

    // ===== Регистрация passkey (только админ, уже вошедший) =====

    [HttpPost("register/begin")]
    [Authorize]
    public async Task<IActionResult> RegisterBegin()
    {
        if (CurrentUserId is not { } userId) return Unauthorized();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Unauthorized();

        var existing = await _db.PasskeyCredentials.Where(c => c.UserId == userId).Select(c => c.CredentialId).ToListAsync();
        var exclude = existing.Select(b64 => new PublicKeyCredentialDescriptor(WebEncoders.Base64UrlDecode(b64))).ToList();

        var fidoUser = new Fido2User
        {
            Id = Encoding.UTF8.GetBytes(user.Id.ToString()),
            Name = user.Email,
            DisplayName = $"{user.FirstName} {user.LastName}".Trim()
        };

        var options = _fido2.RequestNewCredential(new RequestNewCredentialParams
        {
            User = fidoUser,
            ExcludeCredentials = exclude,
            AuthenticatorSelection = new AuthenticatorSelection
            {
                ResidentKey = ResidentKeyRequirement.Required,
                UserVerification = UserVerificationRequirement.Required,
                AuthenticatorAttachment = AuthenticatorAttachment.Platform
            },
            AttestationPreference = AttestationConveyancePreference.None
        });

        _cache.Set($"webauthn:reg:{userId}", options.ToJson(), TimeSpan.FromMinutes(5));
        return Content(options.ToJson(), "application/json");
    }

    [HttpPost("register/complete")]
    [Authorize]
    public async Task<IActionResult> RegisterComplete([FromBody] AuthenticatorAttestationRawResponse attestationResponse)
    {
        if (CurrentUserId is not { } userId) return Unauthorized();

        if (!_cache.TryGetValue($"webauthn:reg:{userId}", out string? optionsJson) || optionsJson is null)
            return BadRequest(new { message = "Сессия регистрации истекла, попробуйте снова." });

        var options = CredentialCreateOptions.FromJson(optionsJson);

        try
        {
            var result = await _fido2.MakeNewCredentialAsync(new MakeNewCredentialParams
            {
                AttestationResponse = attestationResponse,
                OriginalOptions = options,
                IsCredentialIdUniqueToUserCallback = async (args, ct) =>
                {
                    var b64 = WebEncoders.Base64UrlEncode(args.CredentialId);
                    return !await _db.PasskeyCredentials.AnyAsync(c => c.CredentialId == b64, ct);
                }
            });

            _db.PasskeyCredentials.Add(new PasskeyCredential
            {
                UserId = userId,
                CredentialId = WebEncoders.Base64UrlEncode(result.Id),
                PublicKey = result.PublicKey,
                UserHandle = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(userId.ToString())),
                SignCount = result.SignCount,
                AaGuid = result.AaGuid
            });
            await _db.SaveChangesAsync();
            _cache.Remove($"webauthn:reg:{userId}");

            return Ok(new { message = "Отпечаток привязан." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Не удалось привязать отпечаток: " + ex.Message });
        }
    }

    [HttpGet("status")]
    [Authorize]
    public async Task<IActionResult> Status()
    {
        if (CurrentUserId is not { } userId) return Unauthorized();
        var count = await _db.PasskeyCredentials.CountAsync(c => c.UserId == userId);
        return Ok(new { count });
    }

    [HttpDelete("passkeys")]
    [Authorize]
    public async Task<IActionResult> RemoveMine()
    {
        if (CurrentUserId is not { } userId) return Unauthorized();
        var mine = await _db.PasskeyCredentials.Where(c => c.UserId == userId).ToListAsync();
        _db.PasskeyCredentials.RemoveRange(mine);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ===== Вход по отпечатку (без пароля) =====

    [HttpPost("login/begin")]
    [AllowAnonymous]
    public IActionResult LoginBegin()
    {
        var options = _fido2.GetAssertionOptions(new GetAssertionOptionsParams
        {
            AllowedCredentials = new List<PublicKeyCredentialDescriptor>(),
            UserVerification = UserVerificationRequirement.Required
        });

        var key = Guid.NewGuid().ToString("N");
        var optionsJson = options.ToJson();
        _cache.Set($"webauthn:login:{key}", optionsJson, TimeSpan.FromMinutes(5));

        return Content($"{{\"key\":\"{key}\",\"options\":{optionsJson}}}", "application/json");
    }

    [HttpPost("login/complete")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> LoginComplete([FromBody] AssertionCompleteDto dto)
    {
        if (string.IsNullOrEmpty(dto.Key) ||
            !_cache.TryGetValue($"webauthn:login:{dto.Key}", out string? optionsJson) || optionsJson is null)
            return Unauthorized(new { message = "Сессия входа истекла, попробуйте снова." });

        var options = AssertionOptions.FromJson(optionsJson);
        var credentialIdB64 = WebEncoders.Base64UrlEncode(dto.Response.RawId);

        var cred = await _db.PasskeyCredentials.FirstOrDefaultAsync(c => c.CredentialId == credentialIdB64);
        if (cred is null)
            return Unauthorized(new { message = "Отпечаток не распознан." });

        try
        {
            var result = await _fido2.MakeAssertionAsync(new MakeAssertionParams
            {
                AssertionResponse = dto.Response,
                OriginalOptions = options,
                StoredPublicKey = cred.PublicKey,
                StoredSignatureCounter = cred.SignCount,
                IsUserHandleOwnerOfCredentialIdCallback = async (args, ct) =>
                {
                    var cb = WebEncoders.Base64UrlEncode(args.CredentialId);
                    var ub = WebEncoders.Base64UrlEncode(args.UserHandle);
                    return await _db.PasskeyCredentials.AnyAsync(c => c.CredentialId == cb && c.UserHandle == ub, ct);
                }
            });

            cred.SignCount = result.SignCount;
            await _db.SaveChangesAsync();
            _cache.Remove($"webauthn:login:{dto.Key}");

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == cred.UserId);
            if (user is null)
                return Unauthorized(new { message = "Пользователь не найден." });

            return Ok(new AuthResponseDto
            {
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                PhoneNumber = user.PhoneNumber,
                AccessToken = _tokens.CreateAccessToken(user),
                Role = user.Role,
                EmployeeId = user.EmployeeId
            });
        }
        catch (Exception ex)
        {
            return Unauthorized(new { message = "Не удалось войти по отпечатку: " + ex.Message });
        }
    }
}

public class AssertionCompleteDto
{
    public string Key { get; set; } = string.Empty;
    public AuthenticatorAssertionRawResponse Response { get; set; } = null!;
}
