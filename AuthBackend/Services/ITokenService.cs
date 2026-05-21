using AuthBackend.Models;

namespace AuthBackend.Services;

public interface ITokenService
{
    string CreateAccessToken(User user);
}
