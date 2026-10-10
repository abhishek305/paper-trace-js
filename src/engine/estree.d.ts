import 'estree';

declare module 'estree' {
  interface BaseNodeWithoutComments {
    start?: number;
    end?: number;
  }
}
