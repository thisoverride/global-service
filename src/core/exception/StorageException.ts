import BaseException from "./BaseException";

export default class StorageException extends BaseException {
    constructor(message: string, status: number) {
      super(message,status);
    }
  }