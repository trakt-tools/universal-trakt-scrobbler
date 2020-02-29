import { Page } from "../common/Page";
import { NetflixStore } from "./NetflixStore";
import { NetflixApi } from "./NetflixApi";

function NetflixPage() {
    return Page({serviceName: "Netflix", store: NetflixStore, api: NetflixApi})
};

export { NetflixPage };
