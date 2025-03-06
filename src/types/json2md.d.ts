// src/types/json2md.d.ts
declare module 'json2md' {
  type Json2MdInput = Array<{
    [key: string]: string | string[] | any;
  }>;

  type Json2MdOptions = {
    converters?: Record<string, (input: any, json2md: any) => string>;
  };

  function json2md(input: Json2MdInput, options?: Json2MdOptions): string;
  
  // Add support for default export
  export = json2md;
}