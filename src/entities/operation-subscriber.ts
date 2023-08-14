export default class OperationSubscriber {
  name?: string;
  timeZone?: string;
  smsMobile?: string;
  whatsappMobile?: string;
  email?: string;

  constructor(
    name?: string,
    timeZone?: string,
    smsMobile?: string,
    whatsappMobile?: string,
    email?: string
  ) {
    this.name = name;
    this.timeZone = timeZone;
    this.smsMobile = smsMobile;
    this.whatsappMobile = whatsappMobile;
    this.email = email;
  }
}
