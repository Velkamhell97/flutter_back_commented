import { 
  CollectionReference, 
  DocumentData, 
  DocumentReference,
  DocumentSnapshot,
  FirestoreDataConverter,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot
} from 'firebase-admin/firestore';

import { db } from '../../database/firebase';

const userConverter : FirestoreDataConverter<User>  = {
  toFirestore(user: User): DocumentData {
    return {
      id: user.id, 
      name: user.name, 
      lower: user.lower,
      email: user.email, 
      avatar: user.avatar,
      role: user.role,
      online: user.online,
      google: user.google,
      state: user.state
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): User {
    const data = snapshot.data();
    return new User({
      id: data.id, 
      name: data.name, 
      lower: data.lower,
      email: data.email, 
      avatar: data.avatar,
      role: data.role,
      online: data.online,
      google: data.google,
      state: data.state
    });
  }
};


//-La funcion omite una propiedad (elimina) del objeto pasado como T, la llave la saca extendiendo de las llaves
//-de T, el pick hace lo contrario al omit, selecciona unas llaves y crea un nuevo tipo con estas
// type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

//El partial lo que hace es convertir todas las propiedades de un objeto T, en opcionales, 
//El required hace lo contrario al partial, hace que todas las propiedades de un tipo sean requeridas
// type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

//-Definimos aqui las variables obligatorias que se deben crear junto con el constructor
interface UserPropierties {
  id       ?: string,
  name      : string,
  lower    ?: string,
  email     : string,
  avatar   ?: string,
  online   ?: boolean,
  role      : string,
  google   ?: boolean,
  state    ?: boolean,
}

class User {
  public id       ?: string;
  public name      : string;
  public lower    ?: string;
  public email     : string;
  public avatar   ?: string;
  public role      : string;
  public online   ?: boolean;
  public google   ?: boolean;
  public state    ?: boolean;

  //-Al parecer no se pueden definir variables estaticas constantes (que no cambien), si qusieramos
  //-que esta propiedad este definida en la instancia de la clase tendriamos que dejarla sin el readonly
  //-no funciona de esta manera
  public static usersRef: CollectionReference<User> = db.collection('users').withConverter(userConverter);
 
  //-por otra parte si se esta seguro que no se usara por fuera de esta, se puede dejar privada
  private readonly usersRef: CollectionReference<User>;
  
  constructor({
    //-El id es opcional ya que podriamos utilizar el parent.id para realizar todas las validaciones 
    //-y busquedas con este valor, sin embargo se colocara para fines educativos
    id,
    name,
    lower, 
    email,
    avatar,
    role,
    online,
    google,
    state
  } : UserPropierties){
    this.id = id ?? '';
    this.name = name;
    this.lower = lower;
    this.email = email;
    this.avatar = avatar ?? '';
    this.role = role;
    this.online = online ?? false;
    this.google = google ?? false;
    this.state = state ?? true;

    this.usersRef = db.collection('users').withConverter(userConverter);
  }

  presave(){
    const trim = this.name.split(' ').filter(i => i).join(' ');
    
    this.name  = trim.replace(/(^\w|\s\w)(\S*)/g, (_,m1,m2) => m1.toUpperCase()+m2.toLowerCase());
    this.lower = this.name.toLowerCase();
  }

  async save(id: string){
    this.presave(); 

    // -por alguna razon para los metodos de set y add (escribir) no funciona la variable estatica, se podria
    // -exportar la referencia en vez del userConverter
    await this.usersRef.doc(id).set(this);
  }

  public static async findById(id: string) : Promise<User | undefined> {
    const ref: DocumentReference<User> = User.usersRef.doc(id);
    const doc: DocumentSnapshot<User> = await ref.get();
    
    return doc.data();
  }

  //Metodo generico, no muy util porque firebase no es ese tipo de base de datos y se hace complicada
  //-la creacion de queries complejas
  public static async findOne(data: Partial<UserPropierties>): Promise<User | undefined> {
    data
    //-Para el tipado se debe especificar una condicion initial (esta devuelve todos los elementos)
    // let filter: Query<User> = User.usersRef.where("state","==", true);

    // -Tambien se puede dejar  un tipado multiple o any
    let filter: CollectionReference<User> | Query<User> = User.usersRef;

    //-Por ejemplo para hacer operaciones en cadena and solo se pueden utilizar los mismos operadores
    //-para combinar operadores de igualdad (==, array-contains), con operadores de no igualdad
    //-(<, >, !=) se deben crear indixes personalizados en firebase
    for(const [key, value] of Object.entries(data)){
      filter = filter.where(key,"==", value);
    }

    const snapshot: QuerySnapshot<User> = await filter.get();

    //Con el ? aseguramos de devolver undefined en caso de error
    return snapshot.docs[0]?.data();
  }
}

export default User;