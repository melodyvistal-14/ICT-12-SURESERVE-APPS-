using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using SureserveAPI.Data;

namespace SureserveAPI.Data;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        
        optionsBuilder.UseNpgsql(
            "Host=localhost;Port=5432;Database=sureserve_db;Username=postgres;Password=YOUR_LOCAL_PASSWORD");
        
        return new AppDbContext(optionsBuilder.Options);
    }
}