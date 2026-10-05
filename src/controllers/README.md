# BMS LoopBack 4

A Book Management System API built with LoopBack 4, demonstrating enterprise-grade API development patterns including Dependency Injection, IoC, Interceptors, Providers, Components, and custom Decorators.

## Table of Contents
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Core Concepts](#core-concepts)
- [Advanced Features](#advanced-features)
- [API Endpoints](#api-endpoints)
- [Running the App](#running-the-app)
- [GitHub Branch Protection](#github-branch-protection)

## Overview

This project implements a fully functional REST API for managing books and authors using LoopBack 4. It demonstrates all core LoopBack 4 concepts as required by the assignment, including models, repositories, controllers, datasources, relations, and advanced features like interceptors, providers, components, and custom decorators.

## Project Structure

src/
models/
author.model.ts — Author entity with @model and @property decorators
book.model.ts — Book entity with @hasMany relation to Author
repositories/
author.repository.ts — DefaultCrudRepository for Author
book.repository.ts — DefaultCrudRepository for Book
controllers/
author.controller.ts — Full CRUD endpoints for /authors
book.controller.ts — Full CRUD endpoints for /books
datasources/
db.datasource.ts — In-memory datasource with file persistence
interceptors/
log.interceptor.ts — Global interceptor logging method calls and duration
providers/
book-validator.provider.ts — Custom validation logic via Provider pattern
components/
bms.component.ts — Component registering all providers
decorators/
log-method.decorator.ts — Custom @logMethod method decorator
application.ts — Application class wiring everything together
sequence.ts — Custom request/response pipeline


## Core Concepts

### Models
Models represent domain objects. LoopBack uses TypeScript decorators to define model metadata:

```typescript
@model()
export class Book extends Entity {
  @property({ type: 'number', id: true, generated: true })
  id?: number;

  @property({ type: 'string', required: true })
  title: string;

  @hasMany(() => Book)
  books: Book[];
}
```

### DataSources
DataSources define the database connection. This project uses an in-memory datasource with JSON file persistence, making it easy to run without any external database setup.

### Repositories
Repositories handle all data operations. They extend `DefaultCrudRepository` and are automatically injected with the datasource:

```typescript
export class BookRepository extends DefaultCrudRepository
  Book, typeof Book.prototype.id, BookRelations
> {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(Book, dataSource);
  }
}
```

### Controllers
Controllers define REST API endpoints. LoopBack CLI generates full CRUD controllers automatically, including proper HTTP methods, status codes, and OpenAPI documentation.

### Relations
The Author model has a `@hasMany` relation to Book, establishing a one-to-many relationship where one author can write many books, with `authorId` as the foreign key.

## Advanced Features

### Dependency Injection and IoC
LoopBack uses an IoC (Inversion of Control) container to manage dependencies. Instead of components creating their own dependencies, the framework injects them:

```typescript
constructor(
  @inject('datasources.db')
  private dataSource: DbDataSource,
) {}
```

The `@inject` decorator tells LoopBack's IoC container to resolve and inject the named binding automatically.

### Interceptors
The `LogInterceptor` wraps every method call, logging the method name, arguments, and execution duration:

```typescript
export class LogInterceptor implements Provider<Interceptor> {
  value(): Interceptor {
    return async (invocationCtx, next) => {
      console.log(`[LOG] --> ${invocationCtx.targetName}`);
      const result = await next();
      console.log(`[LOG] <-- completed`);
      return result;
    };
  }
}
```

### Providers
The `BookValidatorProvider` implements the Provider pattern to supply custom validation logic that can be injected anywhere in the application:

```typescript
export class BookValidatorProvider implements Provider<BookValidator> {
  value(): BookValidator {
    return (book) => {
      if (book.bookType === 'Printed' && !book.pageCount)
        throw new Error('Printed books must have a page count');
      return true;
    };
  }
}
```

### Components
The `BmsComponent` bundles related providers and services together, registering them with the application in one place:

```typescript
export class BmsComponent implements Component {
  providers: ProviderMap = {
    'providers.BookValidator': BookValidatorProvider,
  };
}
```

### Custom Decorators
The `@logMethod` decorator is a custom method decorator that attaches metadata to controller methods, demonstrating LoopBack's metadata system:

```typescript
export function logMethod(options: LogMethodOptions = { level: 'info' }) {
  return MethodDecoratorFactory.createDecorator<LogMethodOptions>(
    LOG_METHOD_KEY,
    options,
  );
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /authors | Get all authors |
| POST | /authors | Create a new author |
| GET | /authors/{id} | Get author by ID |
| PATCH | /authors/{id} | Update author |
| DELETE | /authors/{id} | Delete author |
| GET | /books | Get all books |
| POST | /books | Create a new book |
| GET | /books/{id} | Get book by ID |
| PATCH | /books/{id} | Update book |
| DELETE | /books/{id} | Delete book |

Visit the interactive API Explorer at: http://127.0.0.1:3000/explorer

## Running the App

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start the server
npm start

# The server runs at http://127.0.0.1:3000
# API Explorer at http://127.0.0.1:3000/explorer
```

## GitHub Branch Protection

The `main` branch is protected with the following rules configured via GitHub Rulesets:

- **Pull request required** — no direct pushes to main allowed
- **1 approval required** — at least one reviewer must approve before merging
- **Force pushes blocked** — history cannot be rewritten on main
- **Branch deletions blocked** — main cannot be accidentally deleted

This ensures code quality through mandatory code review before any changes reach the main branch.
