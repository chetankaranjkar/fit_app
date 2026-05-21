using GymManagement.Core.DTOs;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;

namespace GymManagement.Infrastructure.Services
{
    public class UserBodyImageService : IUserBodyImageService
    {
        private readonly IUnitOfWork _unitOfWork;

        public UserBodyImageService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<UserBodyImageDto>> GetAllUserBodyImagesAsync()
        {
            var images = await _unitOfWork.UserBodyImages.GetAllAsync();
            return await MapToDtoListAsync(images.OrderByDescending(i => i.ImageDate));
        }

        public async Task<IEnumerable<UserBodyImageDto>> GetUserBodyImagesByUserIdAsync(int userId)
        {
            var images = await _unitOfWork.UserBodyImages.FindAsync(ubi => ubi.UserId == userId);
            return await MapToDtoListAsync(images.OrderByDescending(i => i.ImageDate));
        }

        public async Task<UserBodyImageDto?> GetUserBodyImageByIdAsync(int id)
        {
            var image = await _unitOfWork.UserBodyImages.GetByIdAsync(id);
            if (image == null) return null;

            var images = new[] { image };
            var dtos = await MapToDtoListAsync(images);
            return dtos.FirstOrDefault();
        }

        public async Task<UserBodyImageDto> CreateUserBodyImageAsync(CreateUserBodyImageDto createDto, int? uploadedById, string? uploadedByType)
        {
            var userBodyImage = new UserBodyImage
            {
                UserId = createDto.UserId,
                ImageUrl = string.IsNullOrWhiteSpace(createDto.ImageUrl) ? string.Empty : createDto.ImageUrl.Trim(),
                ImageType = createDto.ImageType,
                ImageDate = createDto.ImageDate ?? DateTime.UtcNow,
                Notes = createDto.Notes,
                WeightKg = createDto.WeightKg,
                BodyFatPercent = createDto.BodyFatPercent,
                UploadedById = uploadedById,
                UploadedByType = uploadedByType
            };

            await _unitOfWork.UserBodyImages.AddAsync(userBodyImage);
            await _unitOfWork.SaveChangesAsync();

            var images = new[] { userBodyImage };
            var dtos = await MapToDtoListAsync(images);
            return dtos.First();
        }

        public async Task<UserBodyImageDto?> UpdateUserBodyImageUrlAsync(int id, string imageUrl)
        {
            var userBodyImage = await _unitOfWork.UserBodyImages.GetByIdAsync(id);
            if (userBodyImage == null) return null;

            userBodyImage.ImageUrl = imageUrl;
            _unitOfWork.UserBodyImages.Update(userBodyImage);
            await _unitOfWork.SaveChangesAsync();

            var images = new[] { userBodyImage };
            var dtos = await MapToDtoListAsync(images);
            return dtos.First();
        }

        public async Task<UserBodyImageDto?> UpdateUserBodyImageAsync(int id, UpdateUserBodyImageDto updateDto)
        {
            var userBodyImage = await _unitOfWork.UserBodyImages.GetByIdAsync(id);
            if (userBodyImage == null) return null;

            if (updateDto.ImageType != null)
                userBodyImage.ImageType = updateDto.ImageType;
            if (updateDto.ImageDate.HasValue)
                userBodyImage.ImageDate = updateDto.ImageDate.Value;
            if (updateDto.Notes != null)
                userBodyImage.Notes = updateDto.Notes;
            if (updateDto.WeightKg.HasValue)
                userBodyImage.WeightKg = updateDto.WeightKg;
            if (updateDto.BodyFatPercent.HasValue)
                userBodyImage.BodyFatPercent = updateDto.BodyFatPercent;

            _unitOfWork.UserBodyImages.Update(userBodyImage);
            await _unitOfWork.SaveChangesAsync();

            var images = new[] { userBodyImage };
            var dtos = await MapToDtoListAsync(images);
            return dtos.First();
        }

        public async Task<bool> DeleteUserBodyImageAsync(int id)
        {
            var userBodyImage = await _unitOfWork.UserBodyImages.GetByIdAsync(id);
            if (userBodyImage == null) return false;

            _unitOfWork.UserBodyImages.Delete(userBodyImage);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        private async Task<IEnumerable<UserBodyImageDto>> MapToDtoListAsync(IEnumerable<UserBodyImage> images)
        {
            var imagesList = images.ToList();
            var userIds = imagesList.Select(i => i.UserId).Distinct().ToList();
            var uploadedByIds = imagesList.Where(i => i.UploadedById.HasValue).Select(i => i.UploadedById!.Value).Distinct().ToList();

            var users = await _unitOfWork.Users.FindAsync(u => userIds.Contains(u.Id));
            var userDict = users.ToDictionary(u => u.Id);

            var instructors = await _unitOfWork.Trainers.FindAsync(i => uploadedByIds.Contains(i.Id));
            var instructorDict = instructors.ToDictionary(i => i.Id);
            var instructorUserIds = instructors.Select(i => i.UserId).Distinct().ToList();
            var instructorUsers = instructorUserIds.Count > 0
                ? await _unitOfWork.Users.FindAsync(u => instructorUserIds.Contains(u.Id))
                : new List<Domain.Entities.User>();
            var instructorUserDict = instructorUsers.ToDictionary(u => u.Id);

            return imagesList.Select(image =>
            {
                var dto = new UserBodyImageDto
                {
                    Id = image.Id,
                    UserId = image.UserId,
                    UserName = userDict.ContainsKey(image.UserId)
                        ? $"{userDict[image.UserId].FirstName} {userDict[image.UserId].LastName}"
                        : "Unknown User",
                    ImageUrl = image.ImageUrl,
                    ImageType = image.ImageType,
                    ImageDate = image.ImageDate,
                    Notes = image.Notes,
                    WeightKg = image.WeightKg,
                    BodyFatPercent = image.BodyFatPercent,
                    UploadedById = image.UploadedById,
                    UploadedByType = image.UploadedByType
                };

                if (image.UploadedById.HasValue)
                {
                    if (image.UploadedByType == "Instructor" && instructorDict.ContainsKey(image.UploadedById.Value))
                    {
                        var instructor = instructorDict[image.UploadedById.Value];
                        var instUser = instructorUserDict.GetValueOrDefault(instructor.UserId);
                        dto.UploadedByName = instUser != null ? $"{instUser.FirstName} {instUser.LastName}" : "Instructor";
                    }
                    else if (image.UploadedByType == "Admin")
                        dto.UploadedByName = "Admin";
                }

                return dto;
            });
        }
    }
}

