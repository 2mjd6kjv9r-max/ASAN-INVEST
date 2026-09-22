using AsanInvest.Application;
using Microsoft.AspNetCore.Mvc;

namespace AsanInvest.Api.Controllers;

[ApiController]
[Route("api/v1")]
public abstract class ApiControllerBase : ControllerBase
{
    protected CurrentUser CurrentUser =>
        HttpContext.Items[CurrentUserMiddleware.ItemKey] as CurrentUser
        ?? throw AppException.Unauthorized();

    protected IActionResult OkData(object? data) => Ok(new { data });

    protected IActionResult CreatedData(object? data) => StatusCode(StatusCodes.Status201Created, new { data });
}
