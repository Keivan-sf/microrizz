export class ActivityTimeout {
  private timer: null | NodeJS.Timeout = null;

  constructor(
    public timeout: number,
    public error_msg: string,
  ) {}

  refresh() {
    console.log("refresh called");
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      throw new Error(this.error_msg);
    }, this.timeout);
  }
}
