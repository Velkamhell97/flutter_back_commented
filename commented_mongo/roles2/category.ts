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
import { Product } from '.';

import { db } from '../database/firebase';
import { productConverter } from './product';

export const categoryConverter : FirestoreDataConverter<Category>  = {
  toFirestore(category: Category): DocumentData {
    return {
      id    : category.id, 
      name  : category.name,
      lower : category.lower,
      user  : category.user,
      state : category.state
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Category {
    const data = snapshot.data();
    return new Category({
      id    : data.id, 
      name  : data.name, 
      lower : data.lower,
      user  :  data.user,
      state : data.state,

      ref: snapshot.ref
    });
  }
};

export interface CategoryPropierties {
  id    ?: string,
  name   : string,
  lower ?: string,
  user  ?: string,
  state ?: boolean,
  ref   ?: DocumentReference<DocumentData>
}

interface QueryOptions {
  limit : number,
  skip  : number,
}

export type PCategoriesProperties = Partial<CategoryPropierties>;
type PQueryOprions = Partial<QueryOptions>;

//Para obtener solo las propiedades que son string
type StringPropertyNames<T> = {
  [K in keyof T]: T[K] extends string | undefined ? K : never;
}[keyof T];

type CategoryStrings = NonNullable<StringPropertyNames<CategoryPropierties>>;
type StringProperties = Pick<CategoryPropierties, CategoryStrings>

class Category {
  public id    ?: string;
  public name   : string;
  public lower ?: string;
  public user  ?: string;
  public state ?: boolean;

  public static categoryRef: CollectionReference<Category> = db.collection('categories').withConverter(categoryConverter);
  private categoryRef: CollectionReference<Category>;
  private ref ?: DocumentReference<DocumentData>;
  
  constructor({id, name, lower, user, state,  ref} : CategoryPropierties){
    this.id    = id ?? '';
    this.name  = name;
    this.lower = lower ?? name;
    this.user  = user
    this.state = state ?? true;

    this.ref = ref;
    this.categoryRef = db.collection('categories').withConverter(categoryConverter);
  }

  copyWith(category: Partial<Category>) {
    return new Category({
      id    : category.id    ?? this.id,
      name  : category.name  ?? this.name,
      lower : category.lower ?? this.lower,
      user  : category.user  ?? this.user,
      state : category.state ?? this.state,
    })
  }

  presave(){
    const trim = this.name.split(' ').filter(i => i).join(' ');

    this.name  = trim.charAt(0).toUpperCase() + trim.substring(1).toLowerCase();
    this.lower = this.name.toLowerCase();

    // this.lower = this.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""); --> Quitar acentos
  }

  //---------------------------------Instance Methods------------------------------//
  async save(): Promise<void>{
    this.presave(); 

    //-Firebase genera sus ids, syncronamente, por lo que no tendremos que hacer otra operacion de actualizacion
    const ref = this.categoryRef.doc();
    this.id = ref.id;

    await ref.set(this);
  }

  async update(data: PCategoriesProperties): Promise<void>{
    for(const [key, value] of Object.entries(data)){
      (<any>this)[key] = value
    }
    
    this.presave();

    const { lower, name, ...rest } = data;

    await this.ref!.update({lower: this.lower, name: this.name, ...rest});
  }

  async destroy(): Promise<void>{
    await this.ref!.delete();
  }

  async getProducts(): Promise<Product[]> {
    //-No trae nada porque solo los users tienen subcollecciones y aqui no se puede hacer populate entre collecciones
    // const products = await this.categoryRef.doc(this.id!).collection('products').withConverter(productConverter).get();
    
    //-La opcion es hacer un query
    const products = await db.collection('products').where('category', '==', this.id).withConverter(productConverter).get();

    return products.docs.map(product => product.data());
  }

  
  //---------------------------------Class Finding Methods------------------------------//
  public static async findById(id: string) : Promise<Category | undefined> {
    const ref: DocumentReference<Category> = Category.categoryRef.doc(id);
    const doc: DocumentSnapshot<Category>  = await ref.get();
    
    return doc.data();
  }

  public static async findByIdAndUpdate(id: string, data: PCategoriesProperties) : Promise<Category>{
    await Category.categoryRef.doc(id).update(data);
    const doc = await Category.categoryRef.doc(id).get();
    
    return doc.data()!.copyWith(data);
  }

  public static async findByIdAndDestroy(id: string) : Promise<void>{
    await Category.categoryRef.doc(id).delete();
  }


  //---------------------------------Class Query Methods------------------------------//
  private static async findQueryWithAnd(data: Partial<Category>, options ?: PQueryOprions): Promise<QuerySnapshot<Category> | undefined> {
    // let filter: Query<User> = User.usersRef.where("state","==", true);
    let filter: CollectionReference<Category> | Query<Category> = Category.categoryRef;

    for(const [key, value] of Object.entries(data)){
      filter = filter.where(key,"==", value);
    }

    if(options?.limit){
      filter = filter.limit(options.limit);
    }
    if(options?.skip){
      filter = filter.offset(options.skip);
    }

    return await filter.get();
  }

  public static async findOneWithAnd(data: Partial<Category>): Promise<Category | undefined> {
    const snapshot = await this.findQueryWithAnd(data);
    return snapshot?.docs[0]?.data();
  }

  public static async findWithAnd(): Promise<Category[]>;
  public static async findWithAnd(data : PCategoriesProperties): Promise<Category[]>;
  public static async findWithAnd(data : PCategoriesProperties, options: PQueryOprions): Promise<Category[]>;

  public static async findWithAnd(data ?: PCategoriesProperties, options ?: PQueryOprions): Promise<Category[]> {
    const snapshot = await this.findQueryWithAnd(data ?? {}, options);

    let users = snapshot!.docs.map(doc => doc.data());

    //-Con el metodo limit y offset podemos hacer un tipo de skip
    return users;
  }

  //solo a las propiedades de texto se les aplica estas validaciones
  public static async findStarstWith(data: Partial<StringProperties>, options ?: PQueryOprions): Promise<Category[]> {
    // let filter: Query<User> = User.usersRef.where("state","==", true);
    let filter: CollectionReference<Category> | Query<Category> = Category.categoryRef;

    for(const [key, value] of Object.entries(data)){
      const strlength = value.length;
      const strFrontCode = value.slice(0, strlength - 1) ;
      const strEndCode = value.slice(strlength - 1, strlength);
      
      const startCode = value;
      const endCode = strFrontCode + String.fromCharCode(strEndCode.charCodeAt(0) + 1);

      filter = filter.where(key,">=", startCode).where(key, "<", endCode);
    }

    if(options?.limit){
      filter = filter.limit(options.limit);
    }
    if(options?.skip){
      filter = filter.offset(options.skip);
    }

    const snapshot = await filter.get();
    
    return snapshot.docs.map(doc => doc.data());

    // const categories = (await Category.categoryRef.get()).docs.map(doc => doc.data());
    // let filter: Category[] = categories;

    // for(const [key, value] of Object.entries(data)){
    //   //-No se puede sacar el tipado para startsWith
    //   filter = filter.filter(user => (<any>user)[key].startsWith(value));
    // }

    // //-Se puede aplicar el slice para los limits
    // return filter;
  }

  toJSON(){
    const { categoryRef, ref, ...category } = this;
    return category;
  }
}

export default Category;