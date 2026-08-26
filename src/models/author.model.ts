import {Entity, model, property, hasMany} from '@loopback/repository';
import {Book} from './book.model';

@model()
export class Author extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  id?: number;

  @property({
    type: 'string',
    required: true,
  })
  firstName: string;

  @property({
    type: 'string',
    required: true,
  })
  lastName: string;

  @property({
    type: 'string',
  })
  email?: string;

  @property({
    type: 'string',
  })
  bio?: string;

  @hasMany(() => Book)
  books: Book[];

  constructor(data?: Partial<Author>) {
    super(data);
  }
}

export interface AuthorRelations {
  // describe navigational properties here
}

export type AuthorWithRelations = Author & AuthorRelations;
