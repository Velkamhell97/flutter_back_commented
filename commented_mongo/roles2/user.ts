import { 
  CollectionReference, 
  DocumentData, 
  DocumentReference,
  DocumentSnapshot,
  FirestoreDataConverter,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  UpdateData
} from 'firebase-admin/firestore';
import { Category, Product } from '.';

import { db } from '../database/firebase';
import { categoryConverter, CategoryPropierties, PCategoriesProperties } from './category';
import { PartialProps, productConverter } from './product';

const userConverter : FirestoreDataConverter<User>  = {
  toFirestore(user: User): DocumentData {
    return {
      id     : user.id, 
      name   : user.name, 
      lower  : user.lower,
      email  : user.email, 
      avatar : user.avatar,
      role   : user.role,
      online : user.online,
      google : user.google,
      state  : user.state
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): User {
    const data = snapshot.data();
    return new User({
      id     : data.id, 
      name   : data.name, 
      lower  : data.lower,
      email  : data.email, 
      avatar : data.avatar,
      role   : data.role,
      online : data.online,
      google : data.google,
      state  : data.state,
      ref    : snapshot.ref
    });
  }
};

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
  ref      ?: DocumentReference<DocumentData>,
}

interface QueryOptions {
  limit : number,
  skip  : number,
}

type PUserProperties = Partial<UserPropierties>;
type PQueryOptions = Partial<QueryOptions>;

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

  public static usersRef: CollectionReference<User> = db.collection('users').withConverter(userConverter);
  private readonly usersRef: CollectionReference<User>;
  private ref ?: DocumentReference<DocumentData>;
  
  constructor({id, name, lower, email, avatar, role, online, google, state, ref} : UserPropierties){
    this.id     = id     ?? '';
    this.name   = name;
    this.lower  = lower ?? name; //-Podemos inicializar con el name y antes de grabarla castearla
    this.email  = email;
    this.avatar = avatar ?? '';
    this.role   = role;
    this.online = online ?? false;
    this.google = google ?? false;
    this.state  = state  ?? true;

    this.ref = ref;
    this.usersRef = db.collection('users').withConverter(userConverter);
  }

  copyWith(user: Partial<User>) {
    return new User({
      id     : user.id     ?? this.id,
      name   : user.name   ?? this.name,
      lower  : user.lower  ?? this.lower,
      email  : user.email  ?? this.email,
      avatar : user.avatar ?? this.avatar,
      role   : user.role   ?? this.role,
      online : user.online ?? this.online,
      google : user.google ?? this.google,
      state : user.state   ?? this.state
    })
  }

  presave(){
    const trim = this.name.split(' ').filter(i => i).join(' ');
    
    this.name  = trim.replace(/(^\w|\s\w)(\S*)/g, (_,m1,m2) => m1.toUpperCase()+m2.toLowerCase());
    this.lower = this.name.toLowerCase();
  }

  //---------------------------------Instance Methods------------------------------//
  async save(id: string): Promise<void>{
    this.presave(); 
    await this.usersRef.doc(id).set(this);
  }

  async update(data: PUserProperties): Promise<void>{
    //-Estamos seguros que al actualizar siempre tendremos la referencia, porque primero traemos de firebase
    await this.ref!.update(data);

    for(const [key, value] of Object.entries(data)){
      (<any>this)[key] = value
    }

    this.presave();
  }

  async destroy(): Promise<void>{
    await this.ref!.delete();
  }

  async addCategory(category: Category): Promise<Category> {
    //-Se puede asignar un id dinamico
    const ref = User.usersRef.doc(this.id!).collection('categories').doc(category.id!).withConverter(categoryConverter);
    await ref.set(category);

    return category;
  }
  
  async getCategories(): Promise<Category[]> {
    const categories = await this.usersRef.doc(this.id!).collection('categories').withConverter(categoryConverter).get();
    
    return categories.docs.map(category => category.data());
  }

  async addProduct(categoryId: string, product: Product): Promise<Product> {
    //-Se puede asignar un id dinamico
    const ref = User.usersRef.doc(this.id!).collection('categories').doc(categoryId).collection('products').doc(product.id).withConverter(productConverter);
    await ref.set(product);

    return product;
  }

  async updateProduct(categoryId: string, productId: string, data: PartialProps): Promise<Product> {
    const ref = User.usersRef.doc(this.id!).collection('categories').doc(categoryId).collection('products').doc(productId).withConverter(productConverter);
    await ref.update(data);

    return (await ref.get()).data()!;
  }

  async deleteProduct(categoryId: string, productId: string): Promise<Product> {
    const ref = User.usersRef.doc(this.id!).collection('categories').doc(categoryId).collection('products').doc(productId).withConverter(productConverter);
    const deleted = (await ref.get()).data()!

    await ref.delete();
    return deleted;
  }
  
  async getProducts(categoryId: string): Promise<Product[]> {
    const products = await this.usersRef.doc(this.id!).collection('categories').doc(categoryId).collection('products').withConverter(productConverter).get();
    
    return products.docs.map(product => product.data());
  }

  //---------------------------------Class Relations Methods------------------------------//
  public static async addCategory(uid: string, category: Category) : Promise<Category | undefined> {
    //-Solucion por si se envia la categoria sin id
    // const categoryRef = User.usersRef.doc(uid).collection('categories').doc().withConverter(categoryConverter);
    // await categoryRef.set(category);
    // return category.copyWith({id: categoryRef.id})
    
    const ref = User.usersRef.doc(uid).collection('categories').doc(category.id!).withConverter(categoryConverter);
    await ref.set(category);

    return category;
  }

  private static presaveCategory(data: PCategoriesProperties): PCategoriesProperties{
    if(!data.name) return data;

    const trim = data.name.split(' ').filter(i => i).join(' ');

    const nameUpper  = trim.charAt(0).toUpperCase() + trim.substring(1).toLowerCase();
    const lowerLower = nameUpper.toLowerCase();
    // this.lower = this.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""); --> Quitar acentos
    const {name, lower, ...rest} = data  ;
    
    return { name: nameUpper, lower: lowerLower, ...rest }
  }

  public static async updateCategory(uid: string, categoryId: string, data: PCategoriesProperties, category: Category) : Promise<Category | undefined> {
    const ref = User.usersRef.doc(uid).collection('categories').doc(categoryId).withConverter(categoryConverter);

    //-Si queremos ejecutar el presave tendremos que extraer la nueva data
    const newData = this.presaveCategory(data);
    await ref.update(newData);

    //-Tambien podriamos recibir el objeto de la categoria hacer el presave por fuera y sobreescribirlo
    // await ref.set(category)
    // return category;

    //-Como no tengo la categoria no hay otra opcion que traerla
    return (await ref.get()).data();
  }


  //---------------------------------Class Finding Methods------------------------------//
  public static async findById(id: string) : Promise<User | undefined> {
    const ref: DocumentReference<User> = User.usersRef.doc(id);
    const doc: DocumentSnapshot<User>  = await ref.get();
    
    return doc.data();
  }

  public static async findByIdAndUpdate(id: string, data: PUserProperties) : Promise<User>{
    await User.usersRef.doc(id).update(data);
    const doc = await User.usersRef.doc(id).get();
    
    return doc.data()!.copyWith(data);
  }

  public static async findByIdAndDestroy(id: string) : Promise<void>{
    await User.usersRef.doc(id).delete();
  }


  //---------------------------------Class Query Methods------------------------------//
  //-Si no manda data ({}) devuelve toda la lista de usuarios y el findOne el primero
  private static async findQueryWithAnd(data: PUserProperties): Promise<QuerySnapshot<User> | undefined> {
    // let filter: Query<User> = User.usersRef.where("state","==", true);
    let filter: CollectionReference<User> | Query<User> = User.usersRef;

    for(const [key, value] of Object.entries(data)){
      filter = filter.where(key,"==", value);
    }

    //-Otra forma de hacer filtros traemos los datos y los filtramos internamente
    // const users = (await User.usersRef.get()).docs.map(doc => doc.data());
    // let filter: User[] = users;

    // for(const [key, value] of Object.entries(data)){
    //   filter = filter.filter(user => (<any>user)[key] == value);
    // }

    const snapshot: QuerySnapshot<User> = await filter.get();
    
    return snapshot;
  }

  public static async findOneWithAnd(data: PUserProperties): Promise<User | undefined> {
    const snapshot = await this.findQueryWithAnd(data);
    return snapshot?.docs[0]?.data();
  }

  //-Forma de sobrecargar funciones, se deben declarar las funciones con menos parametros al inicio
  public static async findWithAnd(): Promise<User[]>;
  public static async findWithAnd(data : PUserProperties): Promise<User[]>;
  public static async findWithAnd(data : PUserProperties, options: PQueryOptions): Promise<User[]>;

  //-Y en la de mas parametros especificar los tipos de casos de las anteriores
  public static async findWithAnd(data ?: PUserProperties, options ?: PQueryOptions): Promise<User[]> {
    const snapshot = await this.findQueryWithAnd(data ?? {});

    let users = snapshot!.docs.map(doc => doc.data());

    return users.slice(options?.skip, options?.limit);
  }
  
  toJSON(){
    const { usersRef, ref, ...user } = this;
    return user;
  }
}

export default User;