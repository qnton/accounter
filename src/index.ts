import { parse_host } from "qnton-tld-extract";
import inquirer from "inquirer";
import figlet from "figlet";
import Imap from "imap";
import * as fs from "fs";

console.log(figlet.textSync("Accounter"));
console.log(
  "Welcome to Accounter, a CLI tool to help you find out what email providers you registerd with.\n\n"
);

interface ImapConfigInterface {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}

const imapConfig: ImapConfigInterface = {
  user: "",
  password: "",
  host: "",
  port: 993,
  tls: true,
};

const validateLength = (value: string) => {
  if (value.length) {
    return true;
  }

  return "Cant be empty";
};

const validateNumber = (value: string) => {
  if (/\d/.test(value)) {
    return true;
  }

  return "Cant be empty";
};

const questions = [
  {
    type: "input",
    name: "user",
    message: "What's your first username?",
    validate: validateLength,
  },
  {
    type: "password",
    name: "password",
    message: "What's your last password?",
    validate: validateLength,
  },
  {
    type: "input",
    name: "host",
    message: "What's your host?",
    validate: validateLength,
  },
  {
    type: "checkbox",
    message: "Do you want to use TLS?",
    name: "tls",
    choices: [
      {
        name: "Use TLS",
        checked: true,
      },
    ],
  },
  {
    type: "input",
    name: "port",
    message: "What Port?",
    default() {
      return "993";
    },
    validate: validateNumber,
  },
];

inquirer.prompt(questions).then(async (answers) => {
  imapConfig.user = answers.user;
  imapConfig.password = answers.password;
  imapConfig.host = answers.host;
  imapConfig.port = answers.port;
  imapConfig.tls = answers.tls[0] === "Use TLS" ? true : false;

  const imapDir = await getEmailDir();

  var tmpAllEmails = await Promise.all(
    imapDir.map(async (item): Promise<string[]> => {
      const tmpEmails = await getEmailDomains(item);
      return tmpEmails;
    })
  );

  const tmpDomainList = tmpAllEmails
    .flatMap((item) => item)
    .map((item) => extractDomains(item));

  let domainList = async () =>
    tmpDomainList.filter((element, index) => {
      return tmpDomainList.indexOf(element) === index && element !== undefined;
    });

  await domainList().then((value) => {
    console.log("Saving to file...");
    fs.writeFile(
      `${new Date().toJSON().slice(0, 10)}_output.json`,
      JSON.stringify(value.sort(), null, 2),
      function (err: any) {
        if (err) throw err;
        console.log("Saved!");
        process.exit(0);
      }
    );
  });
});

async function initialize() {
  return new Imap({
    user: imapConfig.user,
    password: imapConfig.password,
    host: imapConfig.host,
    port: imapConfig.port,
    tls: imapConfig.tls,
    tlsOptions: {
      rejectUnauthorized: false,
    },
  });
}

async function getEmailDir() {
  console.log("Getting email directories...");

  var imap = await initialize();

  const dir: string[] = await new Promise((resolve) => {
    imap.once("ready", function () {
      imap.getBoxes(function (err: any, boxes: any) {
        if (err) throw err;

        const directories = [];

        for (let key in boxes) {
          if (Object.prototype.hasOwnProperty.call(boxes, key)) {
            directories.push({ name: key });
          }
        }

        const questions = [
          {
            type: "checkbox",
            message: "What directories do you want to check?",
            name: "directories",
            choices: directories,
          },
        ];

        inquirer.prompt(questions).then((answers) => {
          const updatedDir = answers.directories.map(
            (answer: string) => answer
          );
          resolve(updatedDir);
        });
      });
    });

    imap.once("error", function (err: any) {
      console.error("Failed to fetch email directories!");
      process.exit(0);
      resolve([]);
    });

    imap.once("end", function () {
      resolve([]);
    });

    imap.connect();
  });

  return dir;
}

function extractDomains(emailList: string) {
  const domainRegex = /[^< ]+(?=>)/g;
  const match = domainRegex.exec(emailList);
  if (match) {
    const address = match[0].split("@").pop();

    if (address) {
      try {
        return parse_host(address).domain;
      } catch (error) {
        console.error("Error parsing host:", error);
        return null;
      }
    }
  }
}

async function getEmailDomains(dir: string) {
  console.log(`Getting emails from ${dir} ...`);
  var imap = await initialize();

  const emailList: string[] = await new Promise((resolve) => {
    const allEmailProvider: string[] = [];

    function openInbox(cb: (err: any, box: any) => void) {
      imap.openBox(dir, true, cb);
    }

    imap.once("ready", function () {
      openInbox(function (err: any, box: any) {
        if (err) throw err;
        var f = imap.seq.fetch("1:*", {
          bodies: "HEADER.FIELDS (FROM TO SUBJECT DATE)",
          struct: true,
        });
        f.on(
          "message",
          function (
            msg: {
              on: (
                arg0: string,
                arg1: (stream: any, info: any) => void
              ) => void;
              once: (
                arg0: string,
                arg1: { (attrs: any): void; (): void }
              ) => void;
            },
            seqno: string
          ) {
            msg.on(
              "body",
              function (
                stream: {
                  on: (arg0: string, arg1: (chunk: any) => void) => void;
                  once: (arg0: string, arg1: () => void) => void;
                },
                info: any
              ) {
                var buffer = "";
                stream.on(
                  "data",
                  function (chunk: { toString: (arg0: string) => string }) {
                    buffer += chunk.toString("utf8");
                  }
                );
                stream.once("end", function () {
                  Imap.parseHeader(buffer).from.map((element: any) => {
                    allEmailProvider.push(element);
                  });
                });
              }
            );
          }
        );
        f.once("error", function (err: string) {
          console.error("Failed to fetch emails!");
          process.exit(0);
        });
        f.once("end", function () {
          imap.end();
          resolve(allEmailProvider);
        });
      });
    });

    imap.once("error", function (err: any) {
      resolve([]);
    });

    imap.once("end", function () {
      resolve([]);
    });

    imap.connect();
  });

  return emailList;
}
