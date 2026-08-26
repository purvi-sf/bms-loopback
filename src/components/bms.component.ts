import {Component, ProviderMap} from '@loopback/core';
import {BookValidatorProvider} from '../providers/book-validator.provider';

export class BmsComponent implements Component {
  providers: ProviderMap = {
    'providers.BookValidator': BookValidatorProvider,
  };

  constructor() {
    console.log('[BmsComponent] BMS Component initialized');
  }
}
