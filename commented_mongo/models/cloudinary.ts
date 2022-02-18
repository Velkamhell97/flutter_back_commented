import { UploadApiResponse, v2 } from 'cloudinary';
import streamifier from 'streamifier';

interface UploadParams {
  path: string,
  filename ?: string,
  folder ?: string
}

class Cloudinary {
  private cloudinary;

  constructor(){
    //-Tambien podemos mezclar la sintaxis vieja require
    this.cloudinary = v2;
  }

  //->Al parecer no es necesario incializar en el server, puede hacerse en el constructor de aqui
  init(){
    // this.cloudinary.config(process.env.CLOUDINARY_URL!); //->No funciono con la variable de entorno
    this.cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_SECRET_KEY
    })
  }

  //->Hay dos formas de subir las imagenes, la primera es asignandoles un id auto generado por cloudinary
  //->y siempre que se vaya a actualizar borrar la anterior imagen, y subimos la nueva con esto llamamos 
  //->una vez mas a la api de cloudinary, pero nos ahorramos una llamada a la db
  //->En este caso en la creacion no tendriamos que hacer una llamada adicional a cloudinary, mienstras
  //->que en el update tendriamos que hacer siempre una llamada adicional
  
  //->La seguna forma es crear primero el producto o usuario en la db, luego con el id que devuelve se sube
  //->La imagen a cloudinary para no tener que borrar la anterior sino sobreescribirla y finalmente
  //->se graba de nuevo en la db la url actualizada, ahorra una llamada a el api de cloudinary
  //->En este caso en la creacion tendriamos que hacer una llamada adicional a la db, para guardar
  //->el url de la imagen subida pero en el update nunca hariamos una llamada adicional a cloudinary

  //->Para esta ocasion es mas rapido el del id, ya que la creacion solo ocurre una vez, mientras que el update
  //->puede ser mas seguido, ademas que el metodo de crear es sincrono y tendriamos el id antes del save
  
  //->Sin embargo para multiples archivos si se necesitaria pensar en otra logica o muy probablemente, la de 
  //->crear ids automaticos sea mejor
  
  async uploadImage({path, filename, folder}: UploadParams) : Promise<UploadApiResponse> {
    //->Si sube el filename es porque tiene donde sobreescribir, si se pasa undefined al public_id
    //->se creara uno 
    return await this.cloudinary.uploader.upload(path,{
      public_id: filename,
      folder:`flutter_chat_back/${folder}`,
      overwrite: filename ? true : false
    });
  }

  async removeImage(url:string, folder?:string) {
    const id = url.split('/').at(-1)!.split('.')[0]
    //->Si no viene el folder se pasa solo el id, caso contrario se pasa un folder/
    const chunk = folder ? (folder + "/") : "" ;

    await this.cloudinary.uploader.destroy(`flutter_chat_back/${chunk}${id}`);
  }

  //->Forma de subir una imagen si tiene formato de bytes
  uploadImageBytes(buffer: string | Buffer, folder:string) : Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      let stream = this.cloudinary.uploader.upload_stream(
        {
          folder:`flutter_chat_back/${folder}`
        },
        (error, result) => {
          if(result){
            resolve(result);
          } else {
            return reject(error);
          }
        },
      )

      streamifier.createReadStream(buffer).pipe(stream);
    })
  }
}

//->Esta exportacion de una instancia permite tener una clase singlenton
export default new Cloudinary();