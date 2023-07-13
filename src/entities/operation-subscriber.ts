export default class OperationSubscriber {
  name?: string;
  timeZone?: string;
  mobile?: string;
  email?: string;

  constructor(
    name?: string,
    timeZone?: string,
    mobile?: string,
    email?: string
  ) {
    this.name = name;
    this.timeZone = timeZone;
    this.mobile = mobile;
    this.email = email;
  }
}
