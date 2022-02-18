import { NextFunction, Request, Response } from "express";
import { UploadedFile } from "express-fileupload";

//->Funciones aninadas, asi se pueden escoger otros fields y extensions para los files
export const validateFiles = (fields:string[] = [], extensions:string[] = []) => {
  return function async(req: Request, res:Response, next: NextFunction){
    //->Chequea si se cargaron archivos, valida de las dos maneras, que no exista o que este vacio
    if (!req.files || Object.keys(req.files).length === 0) {
      res.status(400).json({
        error: 'No files',
        msg: 'No files were uploaded.'
      });
      return;
    }

    const fileNames = Object.keys(req.files)
  
    //->Que los files contengan todos los fields esperados
    const containFiles = fields.every(file => fileNames.includes(file))
  
    //->Si no se reciben los archivos esperados arroja el error, si el arreglo esta vacio se permiten todas
    if (!containFiles) {
      return res.status(400).json({
        error: 'Required files',
        msg: `The folowing files were expected: ${fields}`
      });
    }

    let error = null;

    //->Verifica que cada valor de los archivos contengan la extension requerida, si esta vacio se permiten todas
    //->Se usa un for porque el forEach no permite el break
    for (let index = 0; index < fileNames.length; index++) {
      const key = fileNames[index];

      const value = req.files![key] as UploadedFile;
      const ext = value.name.split('.').at(-1)!;

      if(!extensions.includes(ext)){
        error = {
          error: 'Invalid extension',
          msg: `The file \'${key}\' have an invalid extension, valid extensions: ${extensions}`
        }

        break;
      }
    }
   
    //->Si hay un error lo devuelve
    if(error){
      return res.status(400).json(error);
    }
    
    next();
  }
}   