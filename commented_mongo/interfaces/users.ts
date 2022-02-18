import { Request, Response } from 'express';
import { FileArray, UploadedFile } from 'express-fileupload';
import { Document, Types } from 'mongoose';

import { User } from '../models/user';

//->El objeto de express de la request luce asi:
// Request<P = core.ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = qs.ParsedQs, Locals extends Record<string, any> = Record<string, any>>

//->Como se puede ver algunos parametros como el ResBody y el ReqBody tienen un typo any, esto permite que puedan
//->ser sobreescritos facilmente y poder asignar nuestros propios objetos en este caso el UserBody
export interface UsersRequest extends Request {
  body : UsersBody
  //->El files por defecto esta sobreescrito por la libreria express-upload o multer, y por esta razon nosotros
  //->no podemos asignarle una nueva definicion de objeto UserFiles, asi esta extienda del tipado original
  //->esto es debido a que el files no tiene un tipo generico any como el ResBody sino que ya tiene una propiedad
  //->definida en un nivel mas arriba, esto impide que nosotros podamos asignarle un tipado diferente
  //->a menos de que lo cambiaemos desde el nivel superio como la libreria, si intentamos asignarle un nuevo 
  //->tipo a esta propiedad que si tiene un tipado definido tendremos un error en las rutas por la misma razon
  //->debido a esto debemos dejar esta propiedad igual y asignarle los valores de manera manual cuando se utilice
  // files ?: UsersFiles
}

//->Aunque sea muy similar al del schema de moongose no podemos usar el mismo, porque en el body
//->especialemente en el caso del update, no se envian muchos de estos archivos y se hacen validaciones
//->como la del password para actualizarse, entonces mientras en el schema el password no puede ser nulo
//->en el body si lo puede ser porque puede que no se envie, ademas de esto cuando trabajamos con la instancia
//->de un modelo asignamos propiedades que son seguras que estan alli ya que asi se define el modelo, con esta
//->forma se tendria que validar con el ! siempre que se use una propiedad del modelo que sabemos que existe porque
//->si no no se hubiera podido crear, a pesar de que parece codigo repetido, es un poco mas practico manejar
//->del body con una interfaz diferente que con la del modelo
interface UsersBody {
  email ?: string,
  password ?: string,
  role ?: string,
  state ?: boolean,
  avatar ?: string
  //->Por si se agrega otra variable
  // [rest: string] : string | boolean | undefined
}

//->No se puede utilizar porque ya el files tiene un tipado definido, lo que se buscaba con esto es que al llamara
//->el files ya por defecto viene el avatar
// interface UsersFiles extends FileArray {
//   avatar: UploadedFile
// }

//->Para facilitar el tipado de los locals ya que no se puede sobreescirbir definimos el tipado de un documento
//->en uno mas corto e intuitivo
export type UserDocument = Document<unknown, any, User> & User & { _id: Types.ObjectId };

//->El objeto response de express luce asi:
// Response<ResBody = any, Locals extends Record<string, any> = Record<string, any>>

//->Como se puede ver el objeto locals, tiene un tipado definido, no es generico ni any, 
//->Por esta razon al igual que en los files del request, no podemos sobreescribirla con otra clase o interfaz
//->desde un nivel menor de jerarquia, entonces al igual que en los files, se deben manejar estos tipados 
//->de manera manual y por eso se crea el UserDocument de arriba para tipar un locals
// export interface UsersResponse extends Response {
//   locals: UsersLocals
// }

//->Con esto se deseaba que en los locals por defecto vinieran estas variables tipadas
// interface UsersLocals {
//   user: Document<unknown, any, User> & User & {
//     _id: Types.ObjectId;
//   }, 
// ->ademas para no llamar el files de nuevo una vez se comprobara que vinieran archivos poner el avatar ahi
//   avatar: UploadedFile | undefined
// }

