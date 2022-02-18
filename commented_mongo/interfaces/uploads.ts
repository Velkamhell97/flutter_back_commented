import { UploadedFile } from "express-fileupload";

//->Solo extendemos el tipado del uploadFile para agregar el fieldname y hacer algunas opearciones con este
export interface CustomUploadedFile extends UploadedFile {
  fieldname: string
}

//->Como deseo que sea la salida al subir un archivo local o a cloudinary
export interface LocalUploadedFile {
  fieldname: string,
  path: string,
  name: string
}

export interface CloudinaryUploadedFile {
  fieldname: string,
  url: string
  name: string
}

