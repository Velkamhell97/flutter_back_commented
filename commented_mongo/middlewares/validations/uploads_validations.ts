import { Request, Response, NextFunction } from "express";
import { UploadedFile } from "express-fileupload";

import { catchError, errorTypes } from "../../errors";

/**
 * @middleware validate user avatar (create and update valid)
 */
 export const validateMultipleFiles = (fields: string[], extensions: string[]) => async(req: Request, res: Response, next: NextFunction) => {
  //->En el file upload checkeamos la existencia del archivo requerido de una forma diferente al de multer
  //->porque son diferentes objetos sin embargo no es mucha diferencia, 
  // const files: CustomUploadedFile[] = [];

  // for(const key in req.files!){
  //   const file = req.files[key] as CustomUploadedFile;
  //   file.fieldname = key;
  //   files.push(file);
  // }

  const files = req.files as Express.Multer.File[] | undefined; //->multer  

  //->el errorhandlre de multer puede validar que no se envien, mas archivos de los esperados o con diferentes fields
  //->pero esto implica manejar crear mas funciones en la ruta y aumentar la complejidad, asi que se utilizara
  //->esta alternativa propia, que funciona para ambas librerias

  //->Si no vienen files o esta vacio ya es un error
  if(!files || !files.length){
    return catchError({
      type: errorTypes.no_files_upload,
      res
    })
  } 

  const fileNames = files.map(f => f.fieldname);
  const containFiles = fields.every(file => fileNames.includes(file))

  // const paths = files.map(f => f.tempPath);
  const paths = files.map(f => f.path);
  
  //->deben venir en la peticion todos los campos requeridos
  if (!containFiles) {
    //->tener en cuenta que para multer el path es el mismo tanto para cuando se utilizan temporales
    //->como para cuando se asigna un folder del servidor, por lo tanto servira el mismo codigo
    //->para el fileupload en un inicio los archivos estarana en el tmp igual antes de ser movidos
    //->por lo que el nombre de esta variable sera el temppath, por lo tanro este codigo es flexible para es
    //-tos casos, ya que solo se crearan los archivos locales finales en los folder sel servidor
    //-al pasar estas valdiaciones, si fallan se borrarran del temp (que no se muy necesario)
    deleteFilesLocal(paths);

    return catchError({
      type: errorTypes.missing_files,
      extra: `The folowing files were expected: ${fields}, recibed: ${fileNames}`,
      res
    })
  }

  let extensionError = '';

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    // const ext = value.name.split('.').at(-1)!;
    const ext = file.originalname.split('.').at(-1)!;

    if(!extensions.includes(ext)){
      extensionError = `The file \'${file.fieldname}\' have an invalid extension, valid extensions: ${extensions}`;
      break;
    }
  }
  
  if(extensionError){
    deleteFilesLocal(paths);

    return catchError({
      type: errorTypes.invalid_file_extension,
      extra: extensionError,
      res
    });
  }
  
  next();
}