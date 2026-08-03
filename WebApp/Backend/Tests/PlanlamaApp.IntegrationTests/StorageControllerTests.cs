using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using PlanlamaApp.Api.Controllers;
using PlanlamaApp.Application.Interfaces;
using Xunit;

namespace PlanlamaApp.IntegrationTests
{
    public class StorageControllerTests
    {
        private readonly Mock<IStorageService> _storageServiceMock;
        private readonly StorageController _controller;

        public StorageControllerTests()
        {
            _storageServiceMock = new Mock<IStorageService>();
            _controller = new StorageController(_storageServiceMock.Object);

            // Mock User Claims
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim("tenant_id", "test_tenant"),
                new Claim(ClaimTypes.NameIdentifier, "test_user")
            }, "mock"));

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        [Fact]
        public void GetUploadUrl_WithValidInputs_ShouldReturnUrl()
        {
            // Arrange
            _storageServiceMock
                .Setup(s => s.GenerateUploadUrl(It.IsAny<string>(), "image/jpeg", It.IsAny<TimeSpan>()))
                .Returns("https://mock.storage/upload");

            // Act
            var result = _controller.GetUploadUrl("photo.jpg", "image/jpeg");

            // Assert
            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();
            okResult!.StatusCode.Should().Be(200);

            var value = okResult.Value as dynamic;
            // Since C# anonymous types return property values via reflection in tests sometimes, let's use a simpler assert.
            // Using dynamic in tests with anonymous types from another assembly (API) can fail. Let's serialize/deserialize or use reflection.
            var jsonString = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
            jsonString.Should().Contain("https://mock.storage/upload");
            jsonString.Should().Contain("test_tenant/test_user");
        }

        [Fact]
        public void GetUploadUrl_WithInvalidContentType_ShouldReturnBadRequest()
        {
            // Act
            var result = _controller.GetUploadUrl("malware.exe", "application/x-msdownload");

            // Assert
            var badRequest = result as BadRequestObjectResult;
            badRequest.Should().NotBeNull();
            badRequest!.Value.Should().Be("Invalid content type. Only JPEG, PNG, and PDF are allowed.");
        }

        [Fact]
        public void GetDownloadUrl_WithValidTenant_ShouldReturnUrl()
        {
            // Arrange
            var objectKey = "test_tenant/test_user/file.pdf";
            _storageServiceMock
                .Setup(s => s.GenerateDownloadUrl(objectKey, It.IsAny<TimeSpan>()))
                .Returns("https://mock.storage/download");

            // Act
            var result = _controller.GetDownloadUrl(objectKey);

            // Assert
            var okResult = result as OkObjectResult;
            okResult.Should().NotBeNull();

            var jsonString = System.Text.Json.JsonSerializer.Serialize(okResult!.Value);
            jsonString.Should().Contain("https://mock.storage/download");
        }

        [Fact]
        public void GetDownloadUrl_WithCrossTenantAccess_ShouldReturnForbid()
        {
            // Arrange (Our user is test_tenant, but requesting another tenant's file)
            var objectKey = "other_tenant/test_user/file.pdf";

            // Act
            var result = _controller.GetDownloadUrl(objectKey);

            // Assert
            var forbidResult = result as ForbidResult;
            if (forbidResult == null)
            {
                var objectResult = result as ObjectResult;
                objectResult.Should().NotBeNull();
                objectResult!.StatusCode.Should().Be(403);
            }
            else
            {
                forbidResult.Should().NotBeNull();
            }
        }
    }
}
