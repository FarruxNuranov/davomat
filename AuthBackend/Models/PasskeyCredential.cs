namespace AuthBackend.Models;

/// <summary>Сохранённый passkey (WebAuthn) для входа по отпечатку. Привязан к пользователю-админу.</summary>
public class PasskeyCredential
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Идентификатор учётных данных (base64url).</summary>
    public string CredentialId { get; set; } = string.Empty;

    /// <summary>Публичный ключ (COSE), как его возвращает Fido2.</summary>
    public byte[] PublicKey { get; set; } = Array.Empty<byte>();

    /// <summary>User handle (base64url) — то, что мы задали как Fido2User.Id.</summary>
    public string UserHandle { get; set; } = string.Empty;

    public uint SignCount { get; set; }

    public Guid AaGuid { get; set; }

    public string? DeviceName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
