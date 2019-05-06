/**
 * @jest-environment jsdom
 */

import axios from "axios";
import { ILogger } from "unmock-core";
import { ignoreStory, kcomnu, unmock } from "../";

class MockLogger implements ILogger {
  private archive: string[] = [];
  public log(msg: string) {
    this.archive.push(msg);
  }
  public clear() {
    this.archive = [];
  }
  public contains(substr: string) {
    for (const loggedMsg of this.archive) {
      if (loggedMsg.includes(substr)) {
        return true;
      }
    }
    return false;
  }
}
const logger = new MockLogger();

beforeEach(async () => {
  require("dotenv").config();
  await unmock(
    ignoreStory({
      logger,
      save: true,
      token: process.env.UNMOCK_TOKEN,
      unmockHost: process.env.UNMOCK_HOST,
      unmockPort: process.env.UNMOCK_PORT,
    }),
  );
});

afterEach(async () => {
  kcomnu();
});

test("back to back requests yield from cache", async () => {
  const {
    data: { projects },
  } = await axios(
    "https://www.behance.net/v2/projects?api_key=u_n_m_o_c_k_200",
  );
  expect(typeof projects[0].id).toBe("number");
  logger.clear();
  // test to make sure cache works
  const { data } = await axios(
    "https://www.behance.net/v2/projects?api_key=u_n_m_o_c_k_200",
  );
  expect(typeof data.projects[0].id).toBe("number");
  expect(logger.contains("cached")).toBe(true);
});
