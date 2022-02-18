import { CollectionReference, FirestoreDataConverter, Query } from "firebase-admin/firestore";
import { db } from "../database/firebase";

interface QueryOptions {
  limit ?: number,
  skip  ?: number,
}

type StringPropsNames<T> = NonNullable<{
  [K in keyof T]: T[K] extends string | undefined ? K : never;
}[keyof T]>;

type StringProps<T> = Pick<T, StringPropsNames<T>>

class FSQuery<T> {
  public static factory<U>(collection:string, converter:FirestoreDataConverter<U>): FSQuery<U> {
    return new FSQuery<U>(collection, converter);
  }

  private filter: Query<T>;
  public ref: CollectionReference<T>;

  constructor(collection:string, converter:FirestoreDataConverter<T>) {
    this.ref = db.collection(collection).withConverter(converter);
    this.filter = this.ref;
    // this.filter = filter;
  }

  //----------------------------------Queries Operations------------------------------------------//
  private queryWhereEqual(data: Partial<T>, options ?: QueryOptions): Query<T> {
    let filter: Query<T> = this.ref;

    for(const [key, value] of Object.entries(data)){
      filter = filter.where(key,"==", value);
    }

    if(options?.limit){
      filter = filter.limit(options.limit);
    }
    if(options?.skip){
      filter = filter.offset(options.skip);
    }

    return filter;
  }

  private queryStartsWith(data: Partial<StringProps<T>>, options ?: QueryOptions): Query<T> {
    let filter: Query<T> = this.ref;

    for(const [key, value] of Object.entries(data)){
      const query = value as string;

      const strlength = query.length;
      const strFrontCode = query.slice(0, strlength - 1) ;
      const strEndCode = query.slice(strlength - 1, strlength);
      
      const startCode = query;
      const endCode = strFrontCode + String.fromCharCode(strEndCode.charCodeAt(0) + 1);

      filter = filter.where(key,">=", startCode).where(key, "<", endCode);
    }

    if(options?.limit){
      filter = filter.limit(options.limit);
    }
    if(options?.skip){
      filter = filter.offset(options.skip);
    }

    return filter;
  }

  //----------------------------------Queries Methods------------------------------------------//
  public whereEqualOne(data: Partial<T>): void {
    const query = this.queryWhereEqual(data);
    this.filter = query;
  }

  public whereEqual(data : Partial<T>, options ?: QueryOptions): void {
    const query = this.queryWhereEqual(data, options);
    this.filter = query;
  }

  public whereStartsWith(data : Partial<T>, options ?: QueryOptions): void {
    const query = this.queryStartsWith(data, options);
    this.filter = query;
  }

  public async getResults():Promise<T[] | undefined> {
    const snapshot = await this.filter.get();
    return snapshot?.docs?.map(doc => doc.data());
  }
}

export default FSQuery;