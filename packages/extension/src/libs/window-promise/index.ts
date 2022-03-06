import { sendToNewWindowFromBackground } from "@/libs/messenger/extension";
import { ProviderName } from "@/types/provider";
import { OnMessageResponse } from "@enkryptcom/types";
import PublicKeyRing from "../keyring/public-keyring";
import Browser from "webextension-polyfill";
import { InternalOnMessageResponse } from "@/types/messenger";
import { getCustomError } from "../error";
const UNLOCK_PATH = "index.html#/enkrypt/unlock-keyring";
class WindowPromise {
  async getRawResponse(
    url: string,
    msg: string,
    tabId: number
  ): Promise<InternalOnMessageResponse> {
    await Browser.tabs.update(tabId, { url });
    return sendToNewWindowFromBackground(
      {
        provider: ProviderName.enkrypt,
        message: msg,
      },
      tabId
    );
  }
  async getResponse(
    url: string,
    msg: string,
    unlockKeyring = false
  ): Promise<InternalOnMessageResponse> {
    console.log(msg);
    const windowInfo = await Browser.windows.create({
      url: "#",
      type: "popup",
      focused: true,
    });
    const tabId: number | undefined = windowInfo.tabs?.length
      ? windowInfo.tabs[0].id
      : 0;
    if (typeof tabId === "undefined") {
      return Promise.resolve({
        error: getCustomError("unknown error, no tabId"),
      });
    }
    if (unlockKeyring && new PublicKeyRing().isLocked()) {
      const unlockKeyring = await this.getRawResponse(
        Browser.runtime.getURL(UNLOCK_PATH),
        msg,
        tabId
      );
      if (unlockKeyring.error) {
        Browser.tabs.remove(tabId);
        return unlockKeyring;
      } else {
        return await this.getRawResponse(
          Browser.runtime.getURL(url),
          msg,
          tabId
        ).then((res) => {
          Browser.tabs.remove(tabId);
          return res;
        });
      }
    }
    return await this.getRawResponse(
      Browser.runtime.getURL(url),
      msg,
      tabId
    ).then((res) => {
      console.log(res, 1);
      Browser.tabs.remove(tabId);
      return res;
    });
  }
}
export default WindowPromise;