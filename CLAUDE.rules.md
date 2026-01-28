# CLAUDE rules

> A comprehensive, generic, and reusable rule set for full-stack software projects with .NET backend and Angular frontend, using Aspire-style orchestration.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Orchestration & Architecture](#2-orchestration--architecture)
3. [Frameworks, Languages & Versioning](#3-frameworks-languages--versioning)
4. [Backend Guidelines (.NET)](#4-backend-guidelines-net)
5. [Frontend Guidelines (Angular)](#5-frontend-guidelines-angular)
6. [Coding Practices](#6-coding-practices)
7. [UI/UX Guidelines](#7-uiux-guidelines)
8. [DevOps & Deployment](#8-devops--deployment)
9. [Security & Performance](#9-security--performance)
10. [Testing Standards](#10-testing-standards)
11. [Changelog](#11-changelog)

---

## 1. Project Structure

### 1.1 Overall Solution Layout

```
Solution/
├── AppName.Api/                    # Main backend API service
├── AppName.AppHost/                # Aspire orchestration host
├── AppName.ServiceDefaults/        # Shared service configuration
├── AppName.Client/                 # Shared client libraries (optional)
├── AppName.Frontend/               # Angular frontend (Pilet/microfrontend)
├── AppName.UnitTest/               # Unit tests
├── AppName.IntegrationTest/        # Integration tests
├── Directory.Packages.props        # Central package version management
├── Directory.Build.props           # Shared build configuration (optional)
├── .slnx                           # Modern solution file format
├── .gitlab-ci.yml                  # CI/CD pipeline (or equivalent)
└── README.md                       # Project documentation
```

### 1.2 Backend Project Structure

```
AppName.Api/
├── Constants/                      # Application constants
│   ├── PathConstants.cs
│   └── AppConstants.cs
├── Controllers/                    # REST API endpoints
│   └── {Entity}Controller.cs
├── Data/                           # Entity models & DbContext
│   ├── Base/                       # Base entity classes
│   │   ├── BaseAuditableEntity.cs
│   │   ├── BaseAuditableTenantAwareEntity.cs
│   │   └── Base{Domain}Entity.cs
│   ├── Interceptors/               # EF Core interceptors
│   │   └── AuditAndSoftDeleteInterceptor.cs
│   ├── {Entity}.cs                 # Domain entities
│   └── AppDbContext.cs             # Database context
├── Dtos/                           # Data transfer objects
│   ├── Mappers/                    # DTO mappers (Riok.Mapperly)
│   │   └── {Entity}Mapper.cs
│   ├── {Entity}Dto.cs
│   └── {Entity}LiteDto.cs
├── Enums/                          # Domain enumerations
│   └── {EnumName}.cs
├── Extensions/                     # Extension methods
│   └── ModelBuilderExtensions.cs
├── Helpers/                        # Utility classes & middleware
│   ├── {Custom}Middleware.cs
│   └── {Utility}Helper.cs
├── Interfaces/                     # Service & entity contracts
│   ├── I{Entity}Service.cs
│   └── I{Concept}Entity.cs
├── Mappers/                        # Query mappers (Gridify)
│   └── {Entity}GridifyMapper.cs
├── Models/                         # Value objects & complex types
│   └── {ComplexType}.cs
├── Services/                       # Business logic services
│   ├── Background/                 # Background/consumer services
│   │   └── {Background}Service.cs
│   └── {Entity}Service.cs
├── Migrations/                     # EF Core migrations
├── Resources/                      # Embedded resources (localization)
├── Properties/
│   └── launchSettings.json
├── Dockerfile
├── Program.cs                      # Application entry point
├── appsettings.json
└── AppName.Api.csproj
```

### 1.3 Frontend Project Structure (Angular)

> **Important**: All pages and components MUST always have 3 separate files:
>
> - `.html` - Template file
> - `.ts` - TypeScript/JavaScript logic
> - `.scss` - Styles (CSS)
>
> Never use inline templates or inline styles. Always use external files.

```
AppName.Frontend/
├── src/
│   ├── app/
│   │   ├── components/             # Reusable UI components
│   │   │   └── {component-name}/
│   │   │       ├── {component-name}.component.ts
│   │   │       ├── {component-name}.component.html
│   │   │       └── {component-name}.component.scss
│   │   ├── pages/                  # Page-level components (routes)
│   │   │   └── {feature}/
│   │   │       ├── {feature}.component.ts
│   │   │       ├── {feature}.component.html
│   │   │       ├── {feature}.component.scss
│   │   │       └── {feature}-detail/
│   │   ├── services/               # Business logic & API services
│   │   │   ├── backend.service.ts
│   │   │   ├── auth-guard.service.ts
│   │   │   └── {domain}.service.ts
│   │   ├── interfaces/             # TypeScript interfaces
│   │   │   └── {interface-name}.ts
│   │   ├── types/                  # Type definitions
│   │   ├── models/                 # Model classes
│   │   ├── constants/              # Application constants
│   │   ├── app.module.ts           # Root module
│   │   ├── app.component.ts        # Root component
│   │   └── app.routes.ts           # Route configuration
│   ├── assets/                     # Static assets (images, icons)
│   │   └── svgs/
│   ├── environments/               # Environment configurations
│   ├── main.ts                     # Bootstrap file
│   ├── index.tsx                   # Microfrontend entry (Piral)
│   └── styles.scss                 # Global styles
├── angular.json                    # Angular CLI configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Dependencies & scripts
├── eslint.config.js                # ESLint configuration
├── .prettierrc                     # Prettier configuration
├── .stylelintrc.json               # StyleLint configuration
├── pilet.json                      # Piral pilet config (if microfrontend)
└── webpack.config.js               # Webpack extensions (if needed)
```

### 1.4 Naming Conventions

| Element                   | Convention             | Example                         |
| ------------------------- | ---------------------- | ------------------------------- |
| **Solution/Project**      | PascalCase             | `AppName.Api`                   |
| **C# Files**              | PascalCase             | `CompanyService.cs`             |
| **C# Classes**            | PascalCase             | `CompanyService`                |
| **C# Interfaces**         | IPascalCase            | `ICompanyService`               |
| **C# Methods**            | PascalCase             | `GetAllAsync()`                 |
| **C# Properties**         | PascalCase             | `CompanyId`                     |
| **C# Private Fields**     | camelCase              | `_logger` or no prefix          |
| **Angular Components**    | kebab-case             | `company-detail.component.ts`   |
| **Angular Selectors**     | kebab-case with prefix | `app-company-detail`            |
| **Angular Services**      | kebab-case             | `backend.service.ts`            |
| **TypeScript Interfaces** | PascalCase             | `Company.ts`                    |
| **SCSS Files**            | kebab-case             | `company-detail.component.scss` |
| **API Routes**            | kebab-case plural      | `/api/companies`                |
| **Database Tables**       | lowercase              | `company`                       |
| **Database Columns**      | lowercase              | `company_id`                    |

---

## 2. Orchestration & Architecture

### 2.1 Aspire-Style Orchestration

Use .NET Aspire for local development orchestration, integrating both backend and frontend:

```csharp
// AppName.AppHost/AppHost.cs
var builder = DistributedApplication.CreateBuilder(args);

// Database resources
var username = builder.AddParameter("username", "localdev");
var password = builder.AddParameter("password", "localdev");
var postgres = builder.AddPostgres("db", username, password)
    .WithContainerName("app_postgres")
    .WithPgAdmin()
    .WithDataVolume();

var database = postgres.AddDatabase("database", "appdb");
var connectionString = builder.AddConnectionString("dbconnection",
    ReferenceExpression.Create($"{database};Include Error Detail=true"));

// Backend API service
var apiService = builder.AddProject<Projects.AppName_Api>("apiservice")
    .WithHttpHealthCheck("/health")
    .WithReference(connectionString)
    .WaitFor(connectionString);

// Add useful endpoint URLs
apiService
    .WithUrl($"{apiService.GetEndpoint("https")}/swagger", "swagger")
    .WithUrl($"{apiService.GetEndpoint("https")}/scalar", "scalar")
    .WithUrl($"{apiService.GetEndpoint("https")}/health", "health");

// Frontend application (Angular)
builder.AddJavaScriptApp("frontend", "../AppName.Frontend", "aspire")
    .WithNpm()
    .WithReference(apiService)
    .WaitFor(apiService)
    .WithHttpEndpoint(port: 4200, env: "PORT");

builder.Build().Run();
```

### 2.2 Service Defaults Pattern

Create a shared project for common service configuration:

```csharp
// ServiceDefaults/Extensions.cs
public static class Extensions
{
    public static TBuilder AddServiceDefaults<TBuilder>(this TBuilder builder)
        where TBuilder : IHostApplicationBuilder
    {
        builder.ConfigureOpenTelemetry();
        builder.AddDefaultHealthChecks();
        builder.Services.AddServiceDiscovery();
        builder.Services.ConfigureHttpClientDefaults(http =>
        {
            http.AddStandardResilienceHandler();
            http.AddServiceDiscovery();
        });
        return builder;
    }

    public static TBuilder ConfigureOpenTelemetry<TBuilder>(this TBuilder builder)
        where TBuilder : IHostApplicationBuilder
    {
        builder.Services.AddOpenTelemetry()
            .WithMetrics(metrics =>
            {
                metrics.AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation();
            })
            .WithTracing(tracing =>
            {
                tracing.AddSource(builder.Environment.ApplicationName)
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation();
            });
        builder.AddOpenTelemetryExporters();
        return builder;
    }

    public static TBuilder AddDefaultHealthChecks<TBuilder>(this TBuilder builder)
        where TBuilder : IHostApplicationBuilder
    {
        builder.Services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy(), ["live"]);
        return builder;
    }
}
```

### 2.3 Architectural Principles

#### Backend Architecture

- **Controller-Service-Repository Pattern**: Controllers handle HTTP, services handle business logic
- **Dependency Injection**: Constructor-based injection for all services
- **Interface Segregation**: Define interfaces for all services
- **Result Pattern**: Use `FluentResults` for error handling instead of exceptions
- **CQRS-lite**: Separate read (Lite DTOs) and write operations where beneficial

#### Frontend Architecture

- **Feature-based Organization**: Group components by domain/feature
- **Standalone + Module Hybrid**: Use standalone components with lazy loading
- **Service-based State**: Simple services with caching for state management
- **Smart/Dumb Component Pattern**: Pages are smart, UI components are dumb

#### Communication Patterns

- **REST API**: Standard HTTP verbs for CRUD operations
- **Message Queue**: MassTransit for async operations and events
- **WebSocket/SSE**: For real-time updates when needed

### 2.4 Multi-Tenancy Architecture

```csharp
// Tenant-aware entity interface
public interface IAuditableTenantAwareEntity : IAuditableEntity
{
    string Tenant { get; set; }
}

// Middleware for tenant validation
public class TenantValidationMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext dbContext)
    {
        if (!context.Request.Path.StartsWithSegments("/api"))
        {
            await next(context);
            return;
        }

        var userTenant = context.User.FindFirst("tenant")?.Value;
        var requestedTenant = context.Request.Headers["x-tenant"].FirstOrDefault()
            ?? userTenant;

        // Validate tenant access
        dbContext.CurrentTenant = requestedTenant;
        await next(context);
    }
}
```

---

## 3. Frameworks, Languages & Versioning

### 3.1 Version Policy

> **ALWAYS use the latest stable versions** of all platforms, runtimes, frameworks, and package managers.

| Technology | Minimum Version       | Update Policy                     |
| ---------- | --------------------- | --------------------------------- |
| .NET       | Latest LTS or Current | Update within 3 months of release |
| Angular    | Latest stable         | Update within 2 months of release |
| Node.js    | Latest LTS            | Match Angular requirements        |
| PostgreSQL | Latest stable         | Update within 6 months            |
| TypeScript | Match Angular         | Bundled with Angular CLI          |

### 3.2 Central Package Management

Use `Directory.Packages.props` for centralized version control:

```xml
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <!-- Framework packages - always latest -->
    <PackageVersion Include="Microsoft.EntityFrameworkCore" Version="*-*" />
    <PackageVersion Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="*-*" />

    <!-- Aspire packages -->
    <PackageVersion Include="Aspire.Hosting.AppHost" Version="*-*" />
    <PackageVersion Include="Aspire.Hosting.PostgreSQL" Version="*-*" />

    <!-- Third-party packages -->
    <PackageVersion Include="FluentResults" Version="*" />
    <PackageVersion Include="MassTransit" Version="*" />
    <PackageVersion Include="Gridify" Version="*" />
    <PackageVersion Include="Riok.Mapperly" Version="*" />
  </ItemGroup>
</Project>
```

### 3.3 Package.json Version Strategy

```json
{
  "dependencies": {
    "@angular/core": "^latest",
    "@angular/forms": "^latest",
    "primeng": "^latest",
    "rxjs": "^latest"
  },
  "devDependencies": {
    "@angular/cli": "^latest",
    "typescript": "~latest",
    "eslint": "^latest",
    "prettier": "^latest"
  }
}
```

### 3.4 Recommended Technology Stack

#### Backend

- **Runtime**: .NET (latest stable)
- **Web Framework**: ASP.NET Core Minimal APIs or Controllers
- **ORM**: Entity Framework Core
- **Database**: PostgreSQL
- **Caching**: HybridCache (optional: Redis)
- **Message Queue**: Channels
- **Authentication**: Keycloak / OpenID Connect
- **API Documentation**: OpenAPI (Swagger/Scalar)
- **Mapping**: Riok.Mapperly (compile-time)
- **Querying**: Gridify (dynamic filtering/sorting)
- **Error Handling**: FluentResults

#### Frontend

- **Framework**: Angular (latest stable)
- **UI Library**: PrimeNG or Angular Material
- **State**: Service-based with caching (or NgRx for complex apps)
- **HTTP**: Angular HttpClient with typed services
- **Forms**: Reactive Forms
- **Styling**: SCSS with CSS variables
- **Microfrontend**: Piral (optional)

---

## 4. Backend Guidelines (.NET)

### 4.1 Entity Design

```csharp
// Base auditable entity
public abstract class BaseAuditableEntity : IAuditableEntity
{
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime ModifiedAt { get; set; }
    public string ModifiedBy { get; set; } = string.Empty;
    public bool IsDeleted { get; set; }
}

// Tenant-aware entity
public abstract class BaseAuditableTenantAwareEntity : BaseAuditableEntity,
    IAuditableTenantAwareEntity
{
    public string Tenant { get; set; } = string.Empty;
}

// Domain entity example
public class Company : BaseAuditableTenantAwareEntity
{
    public int CompanyId { get; set; }
    public required string Name { get; set; }
    public string? Email { get; set; }
    public Address? Address { get; set; }  // Owned type
    public CompanyData? Data { get; set; } // JSONB column

    // Navigation properties
    public int? ParentCompanyId { get; set; }
    public Company? ParentCompany { get; set; }
    public ICollection<Contact> Contacts { get; set; } = [];
}
```

### 4.2 Controller Design

```csharp
[Route("api/[controller]")]
[ApiController]
public class CompaniesController(ICompanyService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<Paging<CompanyDto>>> Get(
        [FromQuery] GridifyQuery query)
    {
        return Ok(await service.GetAsync(query));
    }

    [HttpGet("lite")]
    public async Task<ActionResult<List<CompanyLiteDto>>> GetLite()
    {
        return Ok(await service.GetAllLiteAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CompanyDto>> GetOne(int id)
    {
        var result = await service.GetOneAsync(id);
        return result.ToActionResult();
    }

    [HttpPost]
    public async Task<ActionResult<CompanyDto>> Create([FromBody] Company company)
    {
        var result = await service.CreateAsync(company);
        return result.ToActionResult();
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CompanyDto>> Update(
        int id, [FromBody] Company company)
    {
        var result = await service.UpdateAsync(id, company);
        return result.ToActionResult();
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var result = await service.DeleteAsync(id);
        return result.ToActionResult();
    }
}
```

### 4.3 Service Design

```csharp
public interface ICompanyService
{
    Task<Paging<CompanyDto>> GetAsync(GridifyQuery query);
    Task<List<CompanyLiteDto>> GetAllLiteAsync();
    Task<Result<CompanyDto>> GetOneAsync(int id);
    Task<Result<CompanyDto>> CreateAsync(Company company);
    Task<Result<CompanyDto>> UpdateAsync(int id, Company company);
    Task<Result> DeleteAsync(int id);
}

public class CompanyService(
    ILogger<CompanyService> logger,
    AppDbContext db,
    IPublishEndpoint publishEndpoint,
    IContextService contextService
) : ICompanyService
{
    public async Task<Paging<CompanyDto>> GetAsync(GridifyQuery query)
    {
        var paging = await db.Company
            .AsNoTracking()
            .ApplyFiltering(query)
            .ApplyOrdering(query)
            .ApplyPaging(query);

        return paging.ToDto();
    }

    public async Task<Result<CompanyDto>> GetOneAsync(int id)
    {
        var entity = await db.Company
            .AsNoTracking()
            .Include(x => x.Contacts)
            .FirstOrDefaultAsync(x => x.CompanyId == id);

        if (entity is null)
            return Result.Fail(CustomError.NotFound(nameof(Company), id));

        return entity.ToDetailDto();
    }

    public async Task<Result<CompanyDto>> CreateAsync(Company company)
    {
        if (string.IsNullOrWhiteSpace(company.Name))
            return Result.Fail(CustomError.BadRequest("Name is required"));

        try
        {
            company.Tenant = contextService.Tenant;
            db.Company.Add(company);
            await db.SaveChangesAsync();

            await publishEndpoint.Publish(new EntityCreated<Company>(company));

            return company.ToDetailDto();
        }
        catch (Exception ex)
        {
            return ex.ToResult(logger);
        }
    }

    public async Task<Result<CompanyDto>> UpdateAsync(int id, Company company)
    {
        var existing = await db.Company.FindAsync(id);
        if (existing is null)
            return Result.Fail(CustomError.NotFound(nameof(Company), id));

        try
        {
            db.Entry(existing).CurrentValues.SetValues(company);
            await db.SaveChangesAsync();

            return existing.ToDetailDto();
        }
        catch (Exception ex)
        {
            return ex.ToResult(logger);
        }
    }

    public async Task<Result> DeleteAsync(int id)
    {
        var entity = await db.Company.FindAsync(id);
        if (entity is null)
            return Result.Fail(CustomError.NotFound(nameof(Company), id));

        try
        {
            db.Company.Remove(entity); // Soft delete via interceptor
            await db.SaveChangesAsync();
            return Result.Ok();
        }
        catch (Exception ex)
        {
            return ex.ToResult(logger);
        }
    }
}
```

### 4.4 DbContext Configuration

```csharp
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public string? CurrentTenant { get; set; }

    public virtual DbSet<Company> Company { get; set; }
    public virtual DbSet<Contact> Contact { get; set; }
    // ... other DbSets

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply global query filters
        modelBuilder.Entity<Company>()
            .HasQueryFilter(x => !x.IsDeleted);

        // Configure JSONB columns
        modelBuilder.Entity<Company>()
            .Property(x => x.Data)
            .HasColumnType("jsonb");

        // Configure owned types
        modelBuilder.Entity<Company>()
            .OwnsOne(x => x.Address);

        // Configure indexes
        modelBuilder.Entity<Company>()
            .HasIndex(x => new { x.Name, x.Tenant })
            .IsUnique()
            .HasFilter("isdeleted = false");

        // Apply lowercase naming convention
        modelBuilder.UseLowerCaseNamingConvention();

        // Apply enum to string conversion
        modelBuilder.ApplyEnumAsStringConversion();
    }
}
```

### 4.5 Program.cs Configuration

```csharp
var builder = WebApplication.CreateBuilder(args);

// Service Defaults (Aspire)
builder.AddServiceDefaults();

// Database
var connectionString = builder.Configuration.GetConnectionString("dbconnection");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var dataSource = new NpgsqlDataSourceBuilder(connectionString)
        .EnableDynamicJson()
        .Build();
    options.UseNpgsql(dataSource)
        .AddInterceptors(new AuditAndSoftDeleteInterceptor());
});

// Services
builder.Services.AddScoped<ICompanyService, CompanyService>();
builder.Services.AddScoped<IContextService, ContextService>();

// Message Queue
builder.Services.AddMassTransit(x =>
{
    x.AddConsumers(typeof(Program).Assembly);
    x.UsingInMemory((context, cfg) =>
    {
        cfg.ConfigureEndpoints(context);
    });
});

// Caching
builder.Services.AddHybridCache();

// Authentication
builder.AddAuthentication();

// API
builder.Services.AddControllers(options =>
{
    options.Conventions.Add(new RouteTokenTransformerConvention(
        new KebabCasePluralTransformer()));
});
builder.Services.AddOpenApi();

// JSON configuration
builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// Gridify configuration
GridifyGlobalConfiguration.EnableEntityFrameworkCompatibilityLayer();
GridifyGlobalConfiguration.DefaultPageSize = 50;
GridifyGlobalConfiguration.CaseInsensitiveFiltering = true;

var app = builder.Build();

// Middleware pipeline
app.MapOpenApi();
app.UseExceptionHandler();
app.UseCors();
app.UseRouting();
app.UseAuthentication();
app.UseMiddleware<TenantValidationMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.MapDefaultEndpoints();

app.Run();
```

### 4.6 DTO & Mapping Patterns

```csharp
// DTOs
public class CompanyDto : Company
{
    public string? DisplayName { get; set; }
    public Dictionary<string, object?>? FilterData { get; set; }
}

public class CompanyLiteDto
{
    public int CompanyId { get; set; }
    public required string Name { get; set; }
    public string? City { get; set; }
}

// Mapper using Riok.Mapperly
[Mapper]
public static partial class CompanyMapper
{
    public static CompanyDto ToDetailDto(this Company company)
    {
        var dto = MapToDto(company);
        dto.DisplayName = $"{company.Name} ({company.Address?.City})";
        return dto;
    }

    public static CompanyLiteDto ToLiteDto(this Company company) =>
        new()
        {
            CompanyId = company.CompanyId,
            Name = company.Name,
            City = company.Address?.City
        };

    public static Paging<CompanyDto> ToDto(this Paging<Company> paging)
    {
        return new Paging<CompanyDto>
        {
            Count = paging.Count,
            Data = paging.Data.Select(x => x.ToDetailDto()).ToList()
        };
    }

    private static partial CompanyDto MapToDto(Company company);
    public static partial Company ToModel(this CompanyDto dto);
}
```

---

## 5. Frontend Guidelines (Angular)

### 5.1 Component Structure

```typescript
// Standalone component pattern
@Component({
  selector: 'app-company-list',
  templateUrl: './company-list.component.html',
  styleUrl: './company-list.component.scss',
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    ButtonModule,
    // ... other imports
  ],
})
export class CompanyListComponent implements OnInit {
  // Dependency injection
  private backendService = inject(BackendService);
  private router = inject(Router);

  // Component state
  companies: Company[] = [];
  isLoading = false;
  selectedCompany: Company | null = null;

  ngOnInit(): void {
    this.loadCompanies();
  }

  async loadCompanies(): Promise<void> {
    this.isLoading = true;
    try {
      this.companies = await this.backendService.get<Company[]>('/api/companies/lite');
    } finally {
      this.isLoading = false;
    }
  }

  onSelect(company: Company): void {
    this.router.navigate(['/companies', company.companyId]);
  }
}
```

### 5.2 Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class BackendService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  async get<T>(endpoint: string, params?: HttpParams): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${this.config.apiUrl}${endpoint}`, { params }));
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${this.config.apiUrl}${endpoint}`, body));
  }

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(`${this.config.apiUrl}${endpoint}`, body));
  }

  async delete(endpoint: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.config.apiUrl}${endpoint}`));
  }
}
```

### 5.3 Caching Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class DataCacheService {
  private backendService = inject(BackendService);

  // Cache storage
  private companies: Company[] = [];
  private companiesPromise?: Promise<Company[]>;

  async getCompanies(): Promise<Company[]> {
    // Return cached data
    if (this.companies.length) {
      return this.companies;
    }

    // Deduplicate concurrent requests
    if (this.companiesPromise) {
      return this.companiesPromise;
    }

    // Fetch and cache
    this.companiesPromise = (async () => {
      try {
        this.companies = await this.backendService.get<Company[]>('/api/companies/lite');
        return this.companies;
      } finally {
        this.companiesPromise = undefined;
      }
    })();

    return this.companiesPromise;
  }

  invalidateCompanies(): void {
    this.companies = [];
  }
}
```

### 5.4 Routing Configuration

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'companies',
    pathMatch: 'full',
  },
  {
    path: 'companies',
    loadComponent: () => import('./pages/company/company-list.component').then(m => m.CompanyListComponent),
    canActivate: [authGuard],
    data: {
      breadcrumb: 'Companies',
      permission: 'companies:read',
    },
  },
  {
    path: 'companies/:id',
    loadComponent: () => import('./pages/company/company-detail.component').then(m => m.CompanyDetailComponent),
    canActivate: [authGuard],
    data: {
      breadcrumb: 'Company Details',
      permission: 'companies:read',
    },
  },
  {
    path: '**',
    redirectTo: 'companies',
  },
];

// Auth guard
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthGuardService);
  return authService.canActivate(route, state);
};
```

### 5.5 Form Handling

```typescript
@Component({
  selector: 'app-company-form',
  templateUrl: './company-form.component.html',
  imports: [ReactiveFormsModule /* ... */],
})
export class CompanyFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private formHelper = inject(FormHelperService);

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      email: ['', [Validators.email]],
      address: this.fb.group({
        street: [''],
        city: ['', Validators.required],
        zip: [''],
        country: [''],
      }),
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.formHelper.validate(this.form)) {
      return;
    }

    const company = this.form.value;
    // Submit logic...
  }
}
```

### 5.6 TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true,
    "importHelpers": true,
    "paths": {
      "app/*": ["./src/app/*"],
      "environments/*": ["./src/environments/*"]
    }
  },
  "angularCompilerOptions": {
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
```

### 5.7 Microfrontend Integration (Piral)

- **Piral Shell**: @sip/neodymium npm-package

```typescript
// index.tsx - Piral entry point
import { PiletApi } from '@shell/core';
import { defineNgModule } from 'piral-ng';

export function setup(app: PiletApi): void {
  const fromLazy = defineNgModule(() => import('./app/app.module'));

  // Register main application route
  app.registerPage(`/app/:path*`, fromLazy('app-root'));

  // Register extension points
  app.registerExtension('dashboard-widget', fromLazy('app-dashboard-widget'));

  // Register menu items
  app.registerMenu({
    title: app.translate('menu.companies'),
    route: '/app/companies',
    icon: `${app.meta.basePath}icons/company.svg`,
  });

  // Register breadcrumbs
  app.registerBreadcrumb({
    path: '/app',
    title: app.translate('app.title'),
  });

  // Set translations
  app.setTranslations({
    en: { 'menu.companies': 'Companies' },
    de: { 'menu.companies': 'Firmen' },
  });
}
```

---

## 6. Coding Practices

### 6.1 TypeScript/Node.js

#### Interfaces in eigene Dateien

Interfaces und Types sollten **nicht inline** in Dateien definiert werden, sondern in dedizierte `types/` oder `interfaces/` Verzeichnisse ausgelagert werden.

```typescript
// FALSCH: Interface inline in der Datei
interface AppHostResult {
  appHost: string;
  appHostDir: string;
}

export async function findAppHost(): Promise<AppHostResult> { ... }
```

```typescript
// RICHTIG: Interface aus types-Datei importieren
import type { AppHostResult } from '../types/command-options';

export async function findAppHost(): Promise<AppHostResult> { ... }
```

**Vorteile:**
- Wiederverwendbarkeit über mehrere Dateien
- Zentrale Stelle für Typ-Definitionen
- Bessere Übersichtlichkeit
- Einfachere Wartung

### 6.2 C#/.NET

```csharp
// Use file-scoped namespaces
namespace AppName.Api.Services;

// Use primary constructors
public class CompanyService(
    ILogger<CompanyService> logger,
    AppDbContext db
) : ICompanyService
{
    // Use expression bodies for simple members
    public string ServiceName => nameof(CompanyService);

    // Use pattern matching
    public bool IsValid(object? value) => value switch
    {
        null => false,
        string s => !string.IsNullOrWhiteSpace(s),
        int n => n > 0,
        _ => true
    };

    // Use async/await properly
    public async Task<Result<Company>> GetOneAsync(int id)
    {
        var entity = await db.Company
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.CompanyId == id);

        return entity is null
            ? Result.Fail(CustomError.NotFound(nameof(Company), id))
            : Result.Ok(entity);
    }
}
```

### 6.5 Error Handling

#### Backend (FluentResults)

```csharp
// Custom error definitions
public static class CustomError
{
    public static Error NotFound(string entity, object id) =>
        new Error($"{entity} with ID {id} not found")
            .WithMetadata("code", "NOT_FOUND");

    public static Error BadRequest(string message) =>
        new Error(message)
            .WithMetadata("code", "BAD_REQUEST");

    public static Error Unauthorized(string message) =>
        new Error(message)
            .WithMetadata("code", "UNAUTHORIZED");
}

// Extension for exception handling
public static class ResultExtensions
{
    public static Result<T> ToResult<T>(this Exception ex, ILogger logger)
    {
        logger.LogError(ex, "An error occurred: {Message}", ex.Message);
        return Result.Fail(new ExceptionalError(ex));
    }

    public static ActionResult<T> ToActionResult<T>(this Result<T> result)
    {
        if (result.IsSuccess)
            return new OkObjectResult(result.Value);

        var error = result.Errors.First();
        var code = error.Metadata.GetValueOrDefault("code")?.ToString();

        return code switch
        {
            "NOT_FOUND" => new NotFoundObjectResult(error.Message),
            "BAD_REQUEST" => new BadRequestObjectResult(error.Message),
            "UNAUTHORIZED" => new UnauthorizedObjectResult(error.Message),
            _ => new ObjectResult(error.Message) { StatusCode = 500 }
        };
    }
}
```

#### Frontend (Angular)

```typescript
// Error handling service
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private dialog = inject(DialogService);

  handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      this.handleHttpError(error);
    } else if (error instanceof Error) {
      this.showError(error.message);
    } else {
      this.showError('An unexpected error occurred');
    }
  }

  private handleHttpError(error: HttpErrorResponse): void {
    switch (error.status) {
      case 400:
        this.showError(error.error?.message ?? 'Invalid request');
        break;
      case 401:
        this.showError('Authentication required');
        break;
      case 403:
        this.showError('Access denied');
        break;
      case 404:
        this.showError('Resource not found');
        break;
      default:
        this.showError('Server error. Please try again later.');
    }
  }

  private showError(message: string): void {
    this.dialog.open(ErrorDialogComponent, {
      data: { message },
    });
  }
}
```

### 6.6 Logging Standards

```csharp
// Structured logging with Serilog
public class CompanyService(ILogger<CompanyService> logger, AppDbContext db)
{
    public async Task<Result<Company>> CreateAsync(Company company)
    {
        logger.LogInformation(
            "Creating company {CompanyName} for tenant {Tenant}",
            company.Name,
            company.Tenant);

        try
        {
            db.Company.Add(company);
            await db.SaveChangesAsync();

            logger.LogInformation(
                "Company {CompanyId} created successfully",
                company.CompanyId);

            return company;
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Failed to create company {CompanyName}",
                company.Name);
            return ex.ToResult(logger);
        }
    }
}
```

### 6.7 Documentation Standards

```csharp
/// <summary>
/// Service for managing company entities.
/// </summary>
public interface ICompanyService
{
    /// <summary>
    /// Retrieves a paginated list of companies.
    /// </summary>
    /// <param name="query">Gridify query parameters for filtering, sorting, and paging.</param>
    /// <returns>A paged result containing company DTOs.</returns>
    Task<Paging<CompanyDto>> GetAsync(GridifyQuery query);

    /// <summary>
    /// Retrieves a single company by ID.
    /// </summary>
    /// <param name="id">The company identifier.</param>
    /// <returns>A result containing the company DTO or an error.</returns>
    Task<Result<CompanyDto>> GetOneAsync(int id);
}
```

---

## 7. UI/UX Guidelines

### 7.1 Design System Variables

```scss
// styles.scss - CSS Custom Properties
:root {
  // Colors
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-secondary: #64748b;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;

  // Background
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;

  // Text
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;

  // Borders
  --border-color: #e2e8f0;
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 16px;

  // Spacing
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-xxl: 64px;

  // Shadows
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.1);

  // Typography
  --font-family: 'Inter', system-ui, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
}

// Dark mode
.dark {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --border-color: #334155;
}
```

### 7.2 Responsive Design

```scss
// Breakpoints
$breakpoints: (
  'sm': 640px,
  'md': 768px,
  'lg': 1024px,
  'xl': 1280px,
  '2xl': 1536px,
);

// Mixin for responsive styles
@mixin respond-to($breakpoint) {
  @if map-has-key($breakpoints, $breakpoint) {
    @media (min-width: map-get($breakpoints, $breakpoint)) {
      @content;
    }
  }
}

// Usage
.container {
  padding: var(--spacing-sm);

  @include respond-to('md') {
    padding: var(--spacing-md);
  }

  @include respond-to('lg') {
    padding: var(--spacing-lg);
  }
}
```

### 7.3 Accessibility Standards

```html
<!-- Accessible form example -->
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <div class="form-group">
    <label for="companyName" class="form-label">
      Company Name
      <span class="required" aria-label="required">*</span>
    </label>
    <input
      id="companyName"
      type="text"
      formControlName="name"
      [attr.aria-invalid]="form.get('name')?.invalid && form.get('name')?.touched"
      [attr.aria-describedby]="form.get('name')?.errors ? 'name-error' : null"
      class="form-input" />
    <span *ngIf="form.get('name')?.errors?.['required'] && form.get('name')?.touched" id="name-error" class="error-message" role="alert">
      Company name is required
    </span>
  </div>

  <button type="submit" [disabled]="form.invalid || isSubmitting" [attr.aria-busy]="isSubmitting" class="btn btn-primary">
    {{ isSubmitting ? 'Saving...' : 'Save Company' }}
  </button>
</form>
```

### 7.4 Component Library Usage

```typescript
// PrimeNG configuration
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

const AppPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      // ... color scale
      900: '{blue.900}',
      950: '{blue.950}',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    providePrimeNG({
      theme: {
        preset: AppPreset,
        options: {
          darkModeSelector: '.dark',
        },
      },
    }),
  ],
};
```

### 7.5 Loading States

```typescript
// Loading indicator component
@Component({
  selector: 'app-loading',
  template: `
    <div class="loading-overlay" *ngIf="isLoading" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <span class="sr-only">Loading...</span>
    </div>
  `,
  styles: [
    `
      .loading-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.8);
        z-index: 10;
      }
      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border-color);
        border-top-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class LoadingComponent {
  @Input() isLoading = false;
}
```

---

## 8. DevOps & Deployment

### 8.1 Dockerfile

```dockerfile
# AppName.Api/Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:latest AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:latest AS build
ARG BUILD_CONFIGURATION=Release
ARG APP_VERSION=1.0.0
ARG NUGET_USERNAME
ARG NUGET_PASSWORD
WORKDIR /src

# Copy package management
COPY ["Directory.Packages.props", "."]
COPY ["nuget.config", "."]

# Copy project files
COPY ["AppName.Api/AppName.Api.csproj", "AppName.Api/"]
COPY ["AppName.ServiceDefaults/AppName.ServiceDefaults.csproj", "AppName.ServiceDefaults/"]

# Restore packages
RUN dotnet nuget update source gitlab -u $NUGET_USERNAME -p $NUGET_PASSWORD --store-password-in-clear-text
RUN dotnet restore "AppName.Api/AppName.Api.csproj"

# Copy source code
COPY . .

# Build
WORKDIR "/src/AppName.Api"
RUN dotnet build "AppName.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build /p:Version=$APP_VERSION

# Publish
FROM build AS publish
RUN dotnet publish "AppName.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false /p:Version=$APP_VERSION

# Final image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "AppName.Api.dll"]
```

### 8.2 Environment Configuration

```json
// appsettings.json
{
  "ConnectionStrings": {
    "postgresdb": "Host=localhost;Database=appdb;Username=localdev;Password=localdev"
  },
  "Keycloak": {
    "realm": "apps",
    "auth-server-url": "https://login.salamander.network/",
    "ssl-required": "external",
    "resource": "{appName}",
    "verify-token-audience": true,
    "credentials": {
      "secret": "in-user-secrets"
    },
    "use-resource-role-mappings": true,
    "confidential-port": 0
  }
}
```

### 8.5 Health Checks

```csharp
// Program.cs
builder.Services.AddHealthChecks()
    .AddNpgSql(connectionString, name: "database")
    .AddRedis(redisConnection, name: "redis")
    .AddCheck<CustomHealthCheck>("custom");

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});
```

---

## 9. Security & Performance

### 9.1 Security Best Practices

#### Authentication & Authorization

```csharp
// Program.cs - Authentication setup (from Sip.Tools.Keycloak)
builder.AddKeycloak();
// optional:
builder.AddKeycloakApiService();
```

#### Input Validation

```csharp
// Validate and sanitize input
public async Task<Result<CompanyDto>> CreateAsync(Company company)
{
    // Trim whitespace
    company.Name = company.Name?.Trim();
    company.Email = company.Email?.Trim().ToLowerInvariant();

    // Validate
    if (string.IsNullOrWhiteSpace(company.Name))
        return Result.Fail(CustomError.BadRequest("Name is required"));

    if (company.Name.Length > 200)
        return Result.Fail(CustomError.BadRequest("Name exceeds maximum length"));

    if (!string.IsNullOrEmpty(company.Email) && !IsValidEmail(company.Email))
        return Result.Fail(CustomError.BadRequest("Invalid email format"));

    // Continue with creation...
}
```

#### CORS Configuration

```csharp
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .AllowAnyOrigin()
    .WithMethods(HttpMethod.Get.Method, HttpMethod.Post.Method, HttpMethod.Put.Method, HttpMethod.Delete.Method, HttpMethod.Options.Method)
    .WithHeaders(HeaderNames.ContentType, HeaderNames.Authorization, HeaderNames.AcceptLanguage, "x-api-key", "x-tenant", "x-client-version")
));
```

### 9.2 Performance Optimization

#### Database Query Optimization

```csharp
// Use AsNoTracking for read-only queries
public async Task<List<CompanyLiteDto>> GetAllLiteAsync()
{
    return await db.Company
        .AsNoTracking()
        .Select(x => new CompanyLiteDto
        {
            CompanyId = x.CompanyId,
            Name = x.Name,
            City = x.Address!.City
        })
        .ToListAsync();
}

// Use pagination
public async Task<Paging<CompanyDto>> GetAsync(GridifyQuery query)
{
    return await db.Company
        .AsNoTracking()
        .GridifyAsync(query);
}

// Use Include wisely
public async Task<Company?> GetWithContactsAsync(int id)
{
    return await db.Company
        .AsNoTracking()
        .Include(x => x.Contacts.Where(c => !c.IsDeleted))
        .AsSplitQuery() // For multiple includes
        .FirstOrDefaultAsync(x => x.CompanyId == id);
}
```

#### Caching Strategy

```csharp
// HybridCache usage
public class CompanyService(HybridCache cache, AppDbContext db)
{
    public async Task<List<CompanyLiteDto>> GetAllLiteAsync()
    {
        return await cache.GetOrCreateAsync(
            "companies:lite",
            async token => await db.Company
                .AsNoTracking()
                .Select(x => x.ToLiteDto())
                .ToListAsync(token),
            new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromMinutes(15),
                LocalCacheExpiration = TimeSpan.FromMinutes(5)
            }
        );
    }

    public async Task InvalidateCacheAsync()
    {
        await cache.RemoveAsync("companies:lite");
    }
}
```

#### Response Compression

```csharp
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Optimal;
});

app.UseResponseCompression();
```

#### Frontend Performance

```typescript
// Lazy loading modules
const routes: Routes = [
  {
    path: 'companies',
    loadComponent: () => import('./pages/company/company-list.component')
      .then(m => m.CompanyListComponent),
  },
];

// OnPush change detection
@Component({
  selector: 'app-company-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
})
export class CompanyCardComponent {
  @Input() company!: Company;
}

// Track by function for ngFor
trackByCompanyId(index: number, company: Company): number {
  return company.companyId;
}
```

### 9.3 Monitoring & Observability

```csharp
// OpenTelemetry setup
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService(builder.Environment.ApplicationName))
    .WithTracing(tracing => tracing
        .AddSource(builder.Environment.ApplicationName)
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation()
        .AddOtlpExporter())
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()
        .AddOtlpExporter());

// Custom metrics
public class CompanyService
{
    private static readonly Counter<int> CompaniesCreated =
        Meter.CreateCounter<int>("companies.created");

    public async Task<Result<CompanyDto>> CreateAsync(Company company)
    {
        // ... creation logic
        CompaniesCreated.Add(1, new KeyValuePair<string, object?>("tenant", company.Tenant));
        return company.ToDetailDto();
    }
}
```

---

## 10. Testing Standards

### 10.1 Unit Testing

```csharp
// Unit test base class
public abstract class UnitTestBase : IClassFixture<DatabaseFixture>
{
    protected ServiceProvider Provider { get; }
    protected AppDbContext Db { get; }

    protected UnitTestBase(DatabaseFixture fixture)
    {
        var services = new ServiceCollection();

        // Register mocks
        services.AddScoped<IPublishEndpoint>(_ => new Mock<IPublishEndpoint>().Object);
        services.AddScoped<ILogger<CompanyService>>(_ => new Mock<ILogger<CompanyService>>().Object);

        // Register real services
        services.AddScoped<ICompanyService, CompanyService>();

        ConfigureServices(services);
        Provider = services.BuildServiceProvider();
        Db = Provider.GetRequiredService<AppDbContext>();
    }

    protected virtual void ConfigureServices(IServiceCollection services) { }

    protected T GetService<T>() where T : notnull => Provider.GetRequiredService<T>();

    protected async Task SaveChangesAsync() => await Db.SaveChangesAsync();
}

// Unit test example
public class CompanyServiceTests(DatabaseFixture fixture) : UnitTestBase(fixture)
{
    [Fact]
    public async Task GetOne_ReturnsCompany_WhenExists()
    {
        // Arrange
        var company = new Company { Name = "Test Company", Tenant = "test" };
        Db.Company.Add(company);
        await SaveChangesAsync();

        var service = GetService<ICompanyService>();

        // Act
        var result = await service.GetOneAsync(company.CompanyId);

        // Assert
        result.IsSuccess.ShouldBeTrue();
        result.Value.Name.ShouldBe("Test Company");
    }

    [Fact]
    public async Task GetOne_ReturnsFailure_WhenNotFound()
    {
        // Arrange
        var service = GetService<ICompanyService>();

        // Act
        var result = await service.GetOneAsync(99999);

        // Assert
        result.IsFailed.ShouldBeTrue();
        result.Errors.First().Message.ShouldContain("not found");
    }

    [Fact]
    public async Task Create_ReturnsFailure_WhenNameEmpty()
    {
        // Arrange
        var service = GetService<ICompanyService>();
        var company = new Company { Name = "", Tenant = "test" };

        // Act
        var result = await service.CreateAsync(company);

        // Assert
        result.IsFailed.ShouldBeTrue();
    }
}
```

### 10.2 Integration Testing

```csharp
// Integration test factory
public class WebAppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private PostgreSqlContainer _dbContainer = null!;
    private Respawner _respawner = null!;

    public async ValueTask InitializeAsync()
    {
        _dbContainer = new PostgreSqlBuilder()
            .WithImage("postgres:latest")
            .WithDatabase("testdb")
            .WithUsername("test")
            .WithPassword("test")
            .Build();

        await _dbContainer.StartAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove existing DbContext
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            // Add test database
            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(_dbContainer.GetConnectionString()));

            // Add fake authentication
            services.AddAuthentication("Test")
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", null);
        });

        builder.UseEnvironment("Testing");
    }

    public async Task ResetDatabaseAsync()
    {
        await using var connection = new NpgsqlConnection(_dbContainer.GetConnectionString());
        await connection.OpenAsync();

        _respawner ??= await Respawner.CreateAsync(connection, new RespawnerOptions
        {
            DbAdapter = DbAdapter.Postgres,
            SchemasToInclude = ["public"]
        });

        await _respawner.ResetAsync(connection);
    }

    public new async ValueTask DisposeAsync()
    {
        await _dbContainer.DisposeAsync();
    }
}

// Integration test example
[Collection(nameof(IntegrationTestCollection))]
public class CompanyApiTests(WebAppFactory factory) : IAsyncLifetime
{
    private HttpClient _client = null!;

    public async ValueTask InitializeAsync()
    {
        _client = factory.CreateClient();
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Test");
    }

    public async ValueTask DisposeAsync()
    {
        await factory.ResetDatabaseAsync();
    }

    [Fact]
    public async Task GetCompanies_ReturnsEmptyList_WhenNoData()
    {
        // Act
        var response = await _client.GetAsync("/api/companies");

        // Assert
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<Paging<CompanyDto>>();
        result!.Count.ShouldBe(0);
    }

    [Fact]
    public async Task CreateCompany_ReturnsCreated_WithValidData()
    {
        // Arrange
        var company = new { Name = "Test Company", Email = "test@example.com" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/companies", company);

        // Assert
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<CompanyDto>();
        result!.Name.ShouldBe("Test Company");
        result.CompanyId.ShouldBeGreaterThan(0);
    }
}
```

### 10.3 Frontend Testing

```typescript
// Component test
describe('CompanyListComponent', () => {
  let component: CompanyListComponent;
  let fixture: ComponentFixture<CompanyListComponent>;
  let backendService: jasmine.SpyObj<BackendService>;

  beforeEach(async () => {
    backendService = jasmine.createSpyObj('BackendService', ['get']);

    await TestBed.configureTestingModule({
      imports: [CompanyListComponent],
      providers: [{ provide: BackendService, useValue: backendService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyListComponent);
    component = fixture.componentInstance;
  });

  it('should load companies on init', async () => {
    const mockCompanies = [
      { companyId: 1, name: 'Company 1' },
      { companyId: 2, name: 'Company 2' },
    ];
    backendService.get.and.returnValue(Promise.resolve(mockCompanies));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.companies.length).toBe(2);
    expect(backendService.get).toHaveBeenCalledWith('/api/companies/lite');
  });

  it('should show loading state', () => {
    backendService.get.and.returnValue(new Promise(() => {})); // Never resolves

    fixture.detectChanges();

    expect(component.isLoading).toBeTrue();
  });
});

// Service test
describe('BackendService', () => {
  let service: BackendService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BackendService],
    });

    service = TestBed.inject(BackendService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should make GET request', async () => {
    const mockData = { id: 1, name: 'Test' };
    const promise = service.get<typeof mockData>('/api/test');

    const req = httpMock.expectOne('/api/test');
    expect(req.request.method).toBe('GET');
    req.flush(mockData);

    const result = await promise;
    expect(result).toEqual(mockData);
  });
});
```

### 10.4 Test Organization

```
AppName.UnitTest/
├── Setup/
│   ├── DatabaseFixture.cs
│   ├── UnitTestBase.cs
│   └── TestServiceCollection.cs
├── Mocks/
│   ├── MockPublishEndpoint.cs
│   └── MockContextService.cs
├── Helpers/
│   ├── TestDataBuilder.cs
│   └── AssertionExtensions.cs
├── Services/
│   ├── CompanyServiceTests.cs
│   ├── ContactServiceTests.cs
│   └── ProjectServiceTests.cs
└── AppName.UnitTest.csproj

AppName.IntegrationTest/
├── Setup/
│   ├── WebAppFactory.cs
│   ├── IntegrationTestBase.cs
│   ├── TestAuthHandler.cs
│   └── IntegrationTestCollection.cs
├── Api/
│   ├── CompanyApiTests.cs
│   ├── ContactApiTests.cs
│   └── ProjectApiTests.cs
└── AppName.IntegrationTest.csproj
```

---

## 11. Changelog

Jedes Projekt sollte eine `CHANGELOG.md` Datei im Root-Verzeichnis haben.

### 11.1 Format

```markdown
# Changelog

## Unreleased

- feat: Neue Feature-Beschreibung
- fix: Bugfix-Beschreibung
- refactor: Refactoring-Beschreibung

## 1.2.3 (2026-01-15)

- feat: Feature das released wurde
- fix: Bug der gefixt wurde
- chore: Maintenance-Arbeiten

## 1.2.2 (2026-01-10)

- style: UI-Anpassungen
- docs: Dokumentation ergänzt
```

### 11.2 Prefixes

| Prefix     | Verwendung                                      |
| ---------- | ----------------------------------------------- |
| `feat`     | Neue Features oder Funktionalitäten             |
| `fix`      | Bugfixes                                        |
| `refactor` | Code-Umstrukturierung ohne Funktionsänderung    |
| `style`    | UI/CSS-Änderungen                               |
| `chore`    | Maintenance, Dependencies, Build-Konfiguration  |
| `docs`     | Dokumentation                                   |
| `perf`     | Performance-Verbesserungen                      |
| `test`     | Tests hinzugefügt oder angepasst                |

### 11.3 Regeln

- **Unreleased**: Alle Änderungen die noch nicht released wurden kommen hier rein
- **Versionsnummern**: Semantic Versioning (MAJOR.MINOR.PATCH)
- **Datum**: ISO-Format (YYYY-MM-DD)
- **Sprache**: Einträge in der Projektsprache (Deutsch oder Englisch)
- **Kurz und prägnant**: Jeder Eintrag sollte eine Zeile sein

---

## Summary

This rule set provides comprehensive guidelines for building modern full-stack applications with:

- **.NET Backend**: Clean architecture with controllers, services, and repositories
- **Angular Frontend**: Feature-based organization with standalone components
- **Aspire Orchestration**: Unified local development experience for frontend and backend
- **Quality Standards**: ESLint, Prettier, StyleLint for consistent code style
- **Testing**: Unit and integration tests with real databases
- **DevOps**: CI/CD pipelines with Docker containerization
- **Security**: Authentication, authorization, and security headers
- **Performance**: Caching, compression, and query optimization

**Remember**: Always use the **latest stable versions** of all frameworks, libraries, and tools to benefit from security patches, performance improvements, and new features.
