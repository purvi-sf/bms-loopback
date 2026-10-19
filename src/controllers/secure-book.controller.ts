import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  del,
  get,
  HttpErrors,
  param,
  post,
  requestBody,
  response,
  Response,
  RestBindings,
} from '@loopback/rest';
import {authenticate} from 'loopback4-authentication';
import {authorize} from 'loopback4-authorization';
import {Book} from '../models';
import {BookValidator} from '../providers/book-validator.provider';
import {AuthorRepository, BookRepository} from '../repositories';

export const Permissions = {
  READ_BOOKS: 'READ_BOOKS',
  CREATE_BOOK: 'CREATE_BOOK',
  DELETE_BOOK: 'DELETE_BOOK',
};

export class SecureBookController {
  constructor(
    @repository(BookRepository)
    public bookRepository: BookRepository,
    @repository(AuthorRepository)
    public authorRepository: AuthorRepository,
    @inject('providers.BookValidator')
    private bookValidator: BookValidator,
  ) {}

  // GET /secure/books
  // @authenticate: verifies JWT token -- 401 if missing or invalid
  // @authorize: checks READ_BOOKS permission -- 403 if role lacks it
  @authenticate('bearer')
  @authorize({permissions: [Permissions.READ_BOOKS]})
  @get('/secure/books')
  @response(200, {description: 'Books -- requires READ_BOOKS permission'})
  async find(): Promise<Book[]> {
    return this.bookRepository.find();
  }

  // POST /secure/books - Only admin and editor roles have CREATE_BOOK permission
  @authenticate('bearer')
  @authorize({permissions: [Permissions.CREATE_BOOK]})
  @post('/secure/books')
  @response(201, {
    description: 'Create book -- requires CREATE_BOOK permission',
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['title', 'isbn', 'genre', 'bookType', 'authorId'],
            properties: {
              title: {type: 'string'},
              isbn: {type: 'string'},
              genre: {type: 'string'},
              bookType: {type: 'string'},
              pageCount: {type: 'number'},
              fileSize: {type: 'string'},
              authorId: {type: 'number'},
            },
          },
        },
      },
    })
    book: Omit<Book, 'id'>,
    @inject(RestBindings.Http.RESPONSE) res: Response,
  ): Promise<Book> {
    // BookValidator throws a plain Error; return it as 422 instead of a 500
    try {
      this.bookValidator(book);
    } catch (err) {
      throw new HttpErrors.UnprocessableEntity((err as Error).message);
    }

    const authorExists = await this.authorRepository.exists(book.authorId);
    if (!authorExists) {
      throw new HttpErrors.UnprocessableEntity('Author not found');
    }

    const created = await this.bookRepository.create(book);
    res.status(201);
    return created;
  }

  // DELETE /secure/books/:id - Only admin role has DELETE_BOOK permission
  @authenticate('bearer')
  @authorize({permissions: [Permissions.DELETE_BOOK]})
  @del('/secure/books/{id}')
  @response(204, {
    description: 'Delete book -- requires DELETE_BOOK permission (admin only)',
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.bookRepository.deleteById(id);
  }
}
