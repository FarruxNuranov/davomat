using AuthBackend.DTOs;

namespace AuthBackend.Services;

public interface IAuthService
{
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
}
