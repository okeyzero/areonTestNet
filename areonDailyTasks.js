const ethers = require("ethers");
const Axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");
const { HttpsProxyAgent } = require("https-proxy-agent");
const dotenv = require("dotenv");
dotenv.config();
const proxyList = process.env.proxyList.split(",").map((item) => item.trim());
const proxyApi = process.env.proxyApi;
const threadNum = Number(process.env.threadNum);
const totalNum = Number(process.env.totalNum);
const retryNum = Number(process.env.retryNum);

const mintNftContractAddressList = [
  "0x27534E8f165262d7C50eeDFFae0c8E7eD1Dd2695",
  "0xFEFD42484c93EB9B86F1D61780809f35ea5FAd41",
  "0x6E66b19De1c4808d612c8a8e6887eC83cee63726",
  "0x1Ae6fD8636B411614A6449b4CaBB33b09228d1C0",
  "0x1F9c941Fbf40b51C5bc20772b7f6735E2B5b7A9d",
  "0x9400dE8f80F6B11EBC3e1f247C88E395917e3419",
  "0xE24c9a994F922001DA1A41b5C030d2ce96fF2a38",
  "0xF20f1e2a4FF23798dBC9A5eDA0d8A472434d5483",
  "0xF7c4CEcbED1e0c532CC1498429c75791c985D588",
  "0xc144682a4Bd721778F9C89e189C07855cC238973",
  "0x763baf51C4F5304914944034C8FCEab6fb4883D8",
];
let ipList = [];
let addresses = [];
let picFiles;

async function getIpFromList() {
  // 检测 proxyApi 和 proxyList 是否配置正确
  let proxy = "";
  if (!isNullOrUndefinedOrEmpty(proxyApi)) {
    proxy = getIpFromIpList();
    return proxy;
  }
  if (proxyList.length > 0) {
    proxy = getRandomProxy();
    if ((proxy = "http://username:password@host:port")) {
      return "";
    }
    return proxy;
  }
  return proxy;
}

async function getIPListFromAPI() {
  try {
    const response = await Axios.get(proxyApi); // 替换为实际的API URL
    let ips = response?.data;
    //ips = ips.split("\r\n").filter((ip) => ip.trim() !== "");
    //去除ip 的换行符空格等

    ips = ips
      .split("\n")
      .filter((ip) => ip.trim() !== "")
      .map((ip) => "http://" + ip.trim());

    return ips;
  } catch (error) {
    console.error("Failed to get IP list from API:", error);
    return [];
  }
}

async function getIpFromIpList() {
  if (ipList.length === 0) {
    const ips = await getIPListFromAPI();
    ipList = ipList.concat(ips);
  }
  const ip = ipList.shift();
  return ip;
}

function getRandomProxy() {
  let index = Math.floor(Math.random() * proxyList.length);
  return proxyList[index];
}

function getRandomContractAddress() {
  let index = Math.floor(Math.random() * mintNftContractAddressList.length);
  return mintNftContractAddressList[index];
}

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const saveToFile = (filePath, content) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "", "utf8");
  }
  fs.appendFileSync(filePath, content, "utf8");
};

const saveSuccessfulAddress = (mintedAddress) => {
  const filePath = "successfulAddress.txt";
  const content = `${mintedAddress}\n`;
  saveToFile(filePath, content);
};

const parseFile = (fileName) =>
  fs
    .readFileSync(fileName, "utf8")
    .split("\n")
    .map((str) => str.trim())
    .filter((str) => str.length > 10);

function isNullOrUndefinedOrEmpty(value) {
  return value === null || value === undefined || value === "";
}

function getRandomPic() {
  const picDirectory = "./pic/";
  if (!picFiles) {
    picFiles = fs.readdirSync(picDirectory);
  }
  const randomIndex = Math.floor(Math.random() * picFiles.length);
  const randomPic = picFiles[randomIndex];
  const name = path.parse(randomPic).name;
  const imagePath = picDirectory + randomPic;
  return { name, randomPic, imagePath };
}

class task {
  constructor(address, privateKey, proxy) {
    // 初始化
    this.proxyAgent = new HttpsProxyAgent(proxy);
    this.axios = Axios.create({
      proxy: false,
      httpsAgent: this.proxyAgent,
    });
    this.accountAddress = address;
    this.accessToken = "";
    this.privateKey = privateKey;
    this.provider = new ethers.providers.JsonRpcProvider(
      "https://testnet-rpc.areon.network/"
    );
  }

  async GetNonce() {
    try {
      let res = await this.axios({
        method: "GET",
        headers: {
          Host: "mainservices.areon.network",
          Connection: "keep-alive",
          Accept: "application/json, text/plain, */*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
          Origin: "https://testnet.areon.network",
          Referer: "https://testnet.areon.network/",
          "Accept-Language": "zh-CN,zh;q=0.9",
        },
        url: `https://mainservices.areon.network/member/nonce?accountAddress=${this.accountAddress}`,
      });
      return res?.data;
    } catch (error) {
      return error?.message;
    }
  }

  async GetToken(nonce, signature) {
    try {
      let res = await this.axios({
        method: "POST",
        headers: {
          Host: "mainservices.areon.network",
          Connection: "keep-alive",
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
          Origin: "https://testnet.areon.network",
          Referer: "https://testnet.areon.network/",
          "Accept-Language": "zh-CN,zh;q=0.9",
        },
        url: "https://mainservices.areon.network/member/login",
        data: `{"accountAddress":"${this.accountAddress}","nonce":"${nonce}","signature":"${signature}","signatureMessage":"Please note that any momentary bugs or malfunctions you encounter are likely related to Metamask, not our own blockchain infrastructure."}`,
      });
      return res?.data;
    } catch (error) {
      return error?.message;
    }
  }

  async GetMyTaskInfo() {
    try {
      let res = await this.axios({
        method: "GET",
        headers: {
          Host: "mainservices.areon.network",
          Connection: "keep-alive",
          Accept: "application/json, text/plain, */*",
          Authorization: `Bearer ${this.accessToken}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
          Origin: "https://testnet.areon.network",
          Referer: "https://testnet.areon.network/",
          "Accept-Language": "zh-CN,zh;q=0.9",
        },
        url: "https://mainservices.areon.network/task/myTaskInfo",
      });
      return res?.data;
    } catch (error) {
      return error?.message;
    }
  }

  async TaskDone(taskId) {
    try {
      let res = await this.axios({
        method: "POST",
        headers: {
          Host: "mainservices.areon.network",
          Connection: "keep-alive",
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
          Origin: "https://testnet.areon.network",
          Referer: "https://testnet.areon.network/",
          "Accept-Language": "zh-CN,zh;q=0.9",
        },
        url: "https://mainservices.areon.network/task/done",
        data: `{"taskId":"${taskId}"}`,
      });
      return res?.data;
    } catch (error) {
      return error?.message;
    }
  }
  // 领取6 TAREA
  async claimTAREA() {
    try {
      let res = await this.axios({
        method: "POST",
        headers: {
          Host: "mainservices.areon.network",
          Connection: "keep-alive",
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
          Origin: "https://testnet.areon.network",
          Referer: "https://testnet.areon.network/",
          "Accept-Language": "zh-CN,zh;q=0.9",
        },
        url: "https://mainservices.areon.network/faucet/request",
      });
      return res?.data;
    } catch (error) {
      return error?.message;
    }
  }
  // 领取50 WAREA
  async claimWAREA() {
    try {
      let res = await this.axios({
        method: "POST",
        headers: {
          Host: "mainservices.areon.network",
          Connection: "keep-alive",
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
          Origin: "https://testnet.areon.network",
          Referer: "https://testnet.areon.network/",
          "Accept-Language": "zh-CN,zh;q=0.9",
        },
        url: "https://mainservices.areon.network/claim/request",
        data: { token: "WAREA" },
      });
      return res?.data;
    } catch (error) {
      return error?.message;
    }
  }
  // 创建NFT
  async nftCreate() {
    const { name, randomPic, imagePath } = getRandomPic();
    if (!name || !imagePath) {
      return "获取图片失败";
    }
    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", name);
    formData.append("image", fs.createReadStream(imagePath), {
      filename: randomPic,
      contentType: "image/jpeg",
    });
    try {
      let res = await this.axios({
        method: "POST",
        headers: {
          Host: "mainservices.areon.network",
          Connection: "keep-alive",
          Accept: "application/json, text/plain, */*",
          "Content-Type":
            "multipart/form-data; boundary=----WebKitFormBoundaryWYBJBndRyg10UlL5",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
          Origin: "https://testnet.areon.network",
          Referer: "https://testnet.areon.network/",
          "Accept-Language": "zh-CN,zh;q=0.9",
        },
        url: "https://mainservices.areon.network/nftStoreAsset",
        data: formData,
      });
      return res?.data;
    } catch (error) {
      return error?.message;
    }
  }

  async doMyTask() {
    const wallet = new ethers.Wallet(this.privateKey, this.provider);
    const address = wallet.address;
    let message = "";
    let result = "";
    let bool = false;

    let response = await this.GetNonce();
    let nonce = response?.result?.nonce;
    if (!isNullOrUndefinedOrEmpty(nonce)) {
      console.log(address, "获取Nonce成功", nonce);
    } else {
      console.log(address, "获取Nonce失败", response);
      throw new Error("获取Nonce失败");
    }
    let signature = await wallet.signMessage(
      "Please note that any momentary bugs or malfunctions you encounter are likely related to Metamask, not our own blockchain infrastructure."
    );
    if (!isNullOrUndefinedOrEmpty(signature)) {
      console.log(address, "签名成功");
    } else {
      console.log(address, "签名失败");
      throw new Error("签名失败");
    }

    response = await this.GetToken(nonce, signature);
    this.accessToken = response?.result?.accessToken;
    if (!isNullOrUndefinedOrEmpty(this.accessToken)) {
      console.log(address, "获取Token成功");
    } else {
      console.log(address, "获取Token失败", response);
      throw new Error("获取Token失败");
    }

    //获取任务列表
    response = await this.GetMyTaskInfo();
    message = response?.message;
    if (
      message !== "Successful" ||
      isNullOrUndefinedOrEmpty(response?.result)
    ) {
      console.log(address, "获取任务列表失败:", response);
      throw new Error(`获取任务列表失败:${response}`);
    }
    console.log(address, "获取任务列表:", message);
    result = response.result;

    let canMemberDoTheTaskValues = result.find(
      (task) => task.taskName === "Claim"
    )?.canMemberDoTheTask;
    if (canMemberDoTheTaskValues) {
      console.log(address, "准备领取6个TAREA测试币");
      // // // 领取6个TAREA测试币

      try {
        response = await this.claimTAREA();
        message = response?.message;

        if (message !== "Successful") {
          console.log(address, "领取TAREA币:", response);
          throw new Error(`领取TAREA币:${response}`);
        }
        console.log(address, "领取TAREA代币:", message);
      } catch (error) {
        console.error(address, "领取TAREA代币:", error.message);
      }
      try {
        response = await this.TaskDone("1");
        message = response?.message;
        if (message !== "Successful") {
          console.log(address, "Done_TAREA状态:", response);
          throw new Error(`Done_TAREA状态:${response}`);
        }
        console.log(address, "Done_TAREA状态:", message);
      } catch (error) {
        console.error(address, "Done_TAREA状态:", error.message);
        throw new Error(`Done_TAREA状态:${error.message}`);
      }
    } else {
      console.log(address, "已经领取过TAREA币");
    }

    // // // 领取50个WAREA测试币
    canMemberDoTheTaskValues = result.find(
      (task) => task.taskName === "Claim WAREA"
    )?.canMemberDoTheTask;
    if (canMemberDoTheTaskValues) {
      console.log(address, "准备领取50个WAREA测试币");
      try {
        response = await this.claimWAREA();
        message = response?.message;
        if (message !== "Successful") {
          console.log(address, "领取WAREA代币:", response);
          throw new Error(`领取WAREA代币:${response}`);
        }
        console.log(address, "领取WAREA代币:", message);
      } catch (error) {
        console.error(address, "领取WAREA代币:", error.message);
      }

      try {
        response = await this.TaskDone("12");
        message = response?.message;
        if (message !== "Successful") {
          console.log(address, "Done_WAREA状态:", response);
          throw new Error(`Done_WAREA状态:${response}`);
        }
        console.log(address, "Done_WAREA状态:", message);
      } catch (error) {
        console.error(address, "Done_WAREA状态:", error.message);
        throw new Error(`Done_WAREA状态:${error.message}`);
      }
    } else {
      console.log(address, "已经领取过WAREA币");
    }

    // // // 打入黑洞
    canMemberDoTheTaskValues = result.find(
      (task) => task.taskName === "Burn"
    )?.canMemberDoTheTask;
    if (canMemberDoTheTaskValues) {
      try {
        const priorityFee = ethers.utils.parseUnits("1.5", "gwei"); // gasPrice 转换为 wei 单位
        //估算 gasLimit
        let transaction = {
          to: "0x000000000000000000000000000000000000dead",
          value: ethers.utils.parseEther("2"), // 要发送的以太币数量
          maxFeePerGas: priorityFee, // 设置最大费用每单位 gas
          maxPriorityFeePerGas: priorityFee, // 设置最大优先费用每单位 gas
        };
        const gasLimit = await wallet.estimateGas(transaction);
        transaction.gasLimit = Math.ceil(gasLimit * 1.2);
        // 签署并发送交易
        const txResponse = await wallet.sendTransaction(transaction);
        console.log(address, "Burn交易哈希:", txResponse.hash);
        console.log(address, "Burn等待交易确认...");
        await txResponse.wait();
        console.log(address, "Burn交易已确认");
        // 1,12,5,6,8,7,9,11,10
      } catch (error) {
        console.error(address, "Burn发送交易时出错:", error.message);
      }

      try {
        response = await this.TaskDone("5");
        message = response?.message;
        if (message == "Successful") {
          console.log(address, "Done_Burn状态:", message);
        } else {
          console.log(address, "Done_Burn状态:", response);
        }
      } catch (error) {
        console.error(address, "Burn发送交易时出错:", error.message);
      }
    } else {
      console.log(address, "已经Burn过");
    }

    // // 转账
    canMemberDoTheTaskValues = result.find(
      (task) => task.taskName === "Transfer"
    )?.canMemberDoTheTask;
    if (canMemberDoTheTaskValues) {
      try {
        const priorityFee = ethers.utils.parseUnits("1.5", "gwei"); // gasPrice 转换为 wei 单位
        //const gasLimit = 31500;
        const transaction = {
          to: "0x65f2296010bbce921d8d79a6af6de939de2de943",
          value: ethers.utils.parseEther("2"), // 要发送的以太币数量
          maxFeePerGas: priorityFee, // 设置最大费用每单位 gas
          maxPriorityFeePerGas: priorityFee, // 设置最大优先费用每单位 gas
        };
        const gasLimit = await wallet.estimateGas(transaction);
        transaction.gasLimit = Math.ceil(gasLimit * 1.2);

        // 签署并发送交易
        const txResponse = await wallet.sendTransaction(transaction);
        console.log(address, "Transfer交易哈希:", txResponse.hash);
        console.log(address, "Transfer等待交易确认...");
        await txResponse.wait();
        console.log(address, "Transfer交易已确认");
        // 1,12,5,6,8,7,9,11,10
      } catch (error) {
        console.error(address, "Transfer发送交易时出错:", error.message);
      }
      try {
        response = await this.TaskDone("6");
        message = response?.message;
        if (message == "Successful") {
          console.log(address, "Done_Transfer状态:", message);
        } else {
          console.log(address, "Done_Transfer状态:", response);
        }
      } catch (error) {
        console.error(address, "Transfer发送交易时出错:", error.message);
      }
    } else {
      console.log(address, "已经Transfer过");
    }

    // // MintNft
    canMemberDoTheTaskValues = result.find(
      (task) => task.taskName === "Mint NFT"
    )?.canMemberDoTheTask;
    if (canMemberDoTheTaskValues) {
      try {
        const gasPrice = ethers.utils.parseUnits("2.5", "gwei");
        const transaction = {
          to: getRandomContractAddress(),
          value: ethers.utils.parseEther("1"),
          maxFeePerGas: gasPrice,
          maxPriorityFeePerGas: gasPrice,
          data: "0xa0712d680000000000000000000000000000000000000000000000000000000000000001",
        };
        const gasLimit = await wallet.estimateGas(transaction);
        transaction.gasLimit = Math.ceil(gasLimit * 1.2);

        // 签署并发送交易
        const txResponse = await wallet.sendTransaction(transaction);
        console.log(address, "nftMint交易哈希:", txResponse.hash);
        console.log(address, "nftMint等待交易确认...");
        await txResponse.wait();
        console.log(address, "nftMint交易已确认");
        // 1,12,5,6,8,7,9,11,10
      } catch (error) {
        console.error(address, "nftMint发送交易时出错:", error.message);
      }
      try {
        response = await this.TaskDone("7");
        message = response?.message;
        if (message == "Successful") {
          console.log(address, "Done_nftMint状态:", message);
        } else {
          console.log(address, "Done_nftMint状态:", response);
        }
      } catch (error) {
        console.error(address, "nftMint发送交易时出错:", error.message);
      }
    } else {
      console.log(address, "已经nftMint过");
    }

    // // CreateNFT
    canMemberDoTheTaskValues = result.find(
      (task) => task.taskName === "Create NFT"
    )?.canMemberDoTheTask;
    if (canMemberDoTheTaskValues) {
      response = await this.nftCreate();
      var statusCode = response?.statusCode;
      if (statusCode == 200) {
        var ipfs = response?.result.split("ipfs://")[1];
        console.log(address, "NFT图上传成功", ipfs.toString());
      } else {
        console.log(address, "NFT图上传失败:", response);
      }
      try {
        const abi = [
          {
            inputs: [
              {
                internalType: "string",
                name: "uri",
                type: "string",
              },
            ],
            name: "mint",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ];
        const iface = new ethers.utils.Interface(abi);
        const data = iface.encodeFunctionData("mint", [ipfs.toString()]);
        // console.log('编码后的数据:', data);
        const priorityFee = ethers.utils.parseUnits("1.5", "gwei"); // gasPrice 转换为 wei 单位
        const transaction = {
          to: "0xA9e5b3f32384113A1f9B83748469b2Ed84Ce55f1",
          value: ethers.utils.parseEther("0"),
          maxFeePerGas: priorityFee,
          maxPriorityFeePerGas: priorityFee,
          data: data,
        };
        const gasLimit = await wallet.estimateGas(transaction);
        transaction.gasLimit = Math.ceil(gasLimit * 1.2);
        // 签署并发送交易
        const txResponse = await wallet.sendTransaction(transaction);
        console.log(address, "CreateNFT交易哈希:", txResponse.hash);
        console.log(address, "CreateNFT等待交易确认...");
        await txResponse.wait();
        console.log(address, "CreateNFT交易已确认");
        // 1,12,5,6,8,7,9,11,10
      } catch (error) {
        console.error(address, "CreateNFT发送交易时出错:", error.message);
      }

      try {
        response = await this.TaskDone("8");
        message = response?.message;
        if (message == "Successful") {
          console.log(address, "Done_CreateNFT状态:", message);
        } else {
          console.log(address, "Done_CreateNFT状态:", response);
        }
      } catch (error) {
        console.error(address, "CreateNFT发送交易时出错:", error.message);
      }
    } else {
      console.log(address, "已经CreateNFT过");
    }

    // // SwapCoins
    // // 批准消费
    canMemberDoTheTaskValues = result.find(
      (task) => task.taskName === "Swap Coins"
    )?.canMemberDoTheTask;
    if (canMemberDoTheTaskValues) {
      try {
        const priorityFee = ethers.utils.parseUnits("2.5", "gwei"); // gasPrice 转换为 wei 单位
        const transaction = {
          to: "0xf57ac05da49669ed9c658997174e3550ed5def56",
          value: ethers.utils.parseEther("0"),
          maxFeePerGas: priorityFee,
          maxPriorityFeePerGas: priorityFee,
          data: "0x095ea7b3000000000000000000000000b4c1f8a8b1181c9d813cb828603f0495e8e2048f000000000000000000000000000000000000000000000002b5e3af16b1880000",
        };
        const gasLimit = await wallet.estimateGas(transaction);
        transaction.gasLimit = Math.ceil(gasLimit * 1.2);
        // 签署并发送交易
        const txResponse = await wallet.sendTransaction(transaction);
        console.log(address, "approve交易哈希:", txResponse.hash);
        console.log(address, "approve等待交易确认...");
        await txResponse.wait();
        console.log(address, "approve交易已确认");
      } catch (error) {
        console.error(address, "approve发送交易时出错:", error.message);
      }

      try {
        const priorityFee = ethers.utils.parseUnits("2.5", "gwei"); // gasPrice 转换为 wei 单位
        const transaction = {
          to: "0xb4c1f8a8b1181c9d813cb828603f0495e8e2048f",
          value: ethers.utils.parseEther("0"),
          maxFeePerGas: priorityFee,
          maxPriorityFeePerGas: priorityFee,
          data: "0x53e79cf20000000000000000000000000000000000000000000000000de0b6b3a7640000",
        };
        const gasLimit = await wallet.estimateGas(transaction);
        transaction.gasLimit = Math.ceil(gasLimit * 1.2);
        // 签署并发送交易
        const txResponse = await wallet.sendTransaction(transaction);
        console.log(address, "swap交易哈希:", txResponse.hash);
        console.log(address, "swap等待交易确认...");
        await txResponse.wait();
        console.log(address, "swap交易已确认");
      } catch (error) {
        console.error(address, "swap发送交易时出错:", error.message);
      }
      try {
        response = await this.TaskDone("9");
        message = response?.message;
        if (message == "Successful") {
          console.log(address, "Done_SwapCoins状态:", message);
        } else {
          console.log(address, "Done_SwapCoins状态:", response);
        }
      } catch (error) {
        console.error(address, "swap发送交易时出错:", error.message);
      }
    } else {
      console.log(address, "已经SwapCoins过");
    }

    // // ZealyTasks
    canMemberDoTheTaskValues = result.find(
      (task) => task.taskName === "Zealy Tasks"
    )?.canMemberDoTheTask;
    if (canMemberDoTheTaskValues) {
      response = await this.TaskDone("10");
      message = response?.message;
      if (message == "Successful") {
        console.log(address, "Done_ZealyTasks状态:", message);
      } else {
        console.log(address, "Done_ZealyTasks状态:", response);
      }
    } else {
      console.log(address, "已经ZealyTasks过");
    }

    // // CheckTransactions
    canMemberDoTheTaskValues = result.find(
      (task) => task.taskName === "Check Transactions"
    )?.canMemberDoTheTask;
    if (canMemberDoTheTaskValues) {
      response = await this.TaskDone("11");
      message = response?.message;
      if (message == "Successful") {
        console.log(address, "Done_CheckTransactions状态:", message);
      } else {
        console.log(address, "Done_CheckTransactions状态:", response);
      }
    } else {
      console.log(address, "已经ZealyTasks过");
    }
    bool = true;
    return bool;
  }
}

async function taskToDo() {
  let bool = false;
  let error = "";

  const walletInfo = addresses.shift();
  const privateKey = walletInfo.split("----")[1].trim();
  const wallet = new ethers.Wallet(privateKey);
  console.log(walletInfo);

  const maxRetries = retryNum;
  let retryCount = 0;

  while (retryCount < maxRetries && !bool) {
    const proxy = await getIpFromList();
    if (isNullOrUndefinedOrEmpty(proxy)) {
      return { walletInfo, bool, error: "代理为空" };
    }

    try {
      console.log(wallet.address, "使用代理", proxy);
      let taskTmp = new task(wallet.address, wallet.privateKey, proxy);
      bool = await taskTmp.doMyTask();
      if (!bool) {
        addresses.push(walletInfo);
        throw new Error("任务执行失败");
      }
    } catch (err) {
      addresses.push(walletInfo);
      error = err.message;
      retryCount++;
      console.log(
        `任务执行失败，重试中... (${retryCount}/${maxRetries})`,
        error
      );
    }
  }

  return { walletInfo, bool, error };
}

async function mainDo() {
  const limit = threadNum;
  let activePromises = 0;
  let promisesQueue = [];

  const processQueue = async () => {
    while (promisesQueue.length > 0 && activePromises < limit) {
      const promise = promisesQueue.shift();
      activePromises += 1;
      promise().finally(() => {
        activePromises -= 1;
        processQueue();
      });
    }
  };

  const executeTask = async () => {
    let retryCount = 0;
    let success = false;
    while (retryCount < retryNum && !success) {
      try {
        const { walletInfo, bool, error } = await taskToDo();
        if (!bool) {
          console.log(
            walletInfo.split("----")[0].trim(),
            `任务执行失败 ${error}`
          );
          throw new Error(error);
        }
        saveSuccessfulAddress(walletInfo);
        success = true;
      } catch (error) {
        retryCount++;
        console.log(
          `任务执行失败，重新投递任务 (${retryCount}/1)`,
          error.message
        );
      }
    }
    if (!success) {
      throw new Error("任务执行失败");
    }
  };

  for (let i = 0; i < totalNum; i++) {
    promisesQueue.push(executeTask);
  }

  await processQueue();

  while (activePromises > 0 || promisesQueue.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function main() {
  try {
    addresses = parseFile("successfulAddress.txt");
    console.log("已加载钱包数量", addresses.length);
    if (addresses.length == 0) {
      throw new Error("请导入钱包");
    }
    await getIpFromList();
    if (proxyList.length == 0 && isNullOrUndefinedOrEmpty(proxyApi)) {
      throw new Error("代理列表为空");
    } else {
      await mainDo();
    }
    console.log("任务执行完毕");
  } catch (error) {
    console.log("任务执行失败", error);
  }
}
main();
