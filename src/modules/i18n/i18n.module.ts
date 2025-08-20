import { Module, Global } from '@nestjs/common';
import { I18nModule as NestI18nModule, I18nJsonLoader, QueryResolver, HeaderResolver, AcceptLanguageResolver } from 'nestjs-i18n';
import * as path from 'path';

@Global()
@Module({
  imports: [
    NestI18nModule.forRoot({
      fallbackLanguage: 'ko',
      loaderOptions: {
        path: path.join(__dirname, '../../../i18n/'),
        watch: true,
      },
      loader: I18nJsonLoader,
      resolvers: [
        { use: QueryResolver, options: ['lang', 'locale', 'l'] },
        { use: HeaderResolver, options: ['x-custom-lang'] },
        new AcceptLanguageResolver(),
      ],
      logging: true,
      viewEngine: 'ejs',
    }),
  ],
  exports: [NestI18nModule],
})
export class I18nModule {}