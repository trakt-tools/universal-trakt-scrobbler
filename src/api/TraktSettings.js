import { Requests } from '../services/Requests';
import { TraktApi } from './TraktApi';

class _TraktSettings extends TraktApi {
  constructor() {
    super();
    this.getTimeAndDateFormat = this.getTimeAndDateFormat.bind(this);
  }

  /**
   * @returns {Promise<string>}
   */
  async getTimeAndDateFormat() {
    const responseText = await Requests.send({
      url: this.SETTINGS_URL,
      method: 'GET',
    });
    /** @type {TraktSettingsResponse} */
    const settings = JSON.parse(responseText);
    let dateFormat = "ddd ";
    switch(settings.account.date_format){
      case "dmy":
        dateFormat += "D MMM YYYY";
        break;
      case "mdy":
        dateFormat += "MMM D YYYY";
        break;
      case "ydm":
        dateFormat += "YYYY D MMM";
        break;
      case "ymd":
        dateFormat += "YYYY MMM D";
        break;
      default:
        console.error("Unknown date format", settings.account.date_format);
        return "";
    }
    if (settings.account.time_24hr){
      dateFormat += ", H:mm:ss";
    }else{
      dateFormat += ", h:mm:ss a";
    }
    return dateFormat;
  }

}

const TraktSettings = new _TraktSettings();

export { TraktSettings };
