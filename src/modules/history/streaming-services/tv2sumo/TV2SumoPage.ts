import { TV2SumoApi } from './TV2SumoApi';
import { TV2SumoStore } from "./TV2SumoStore";
import { Page } from "../common/Page";

function TV2SumoPage() {
    return Page({serviceName: "Sumo", store: TV2SumoStore, api: TV2SumoApi})
}

export { TV2SumoPage };
