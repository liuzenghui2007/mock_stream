class StreamMocker {
  constructor() {
    this.listeners = {
      data: [],
      end: [],
    };
    this.intervalId = null;
  }

  onData(callback) {
    this.listeners.data.push(callback);
  }

  onEnd(callback) {
    this.listeners.end.push(callback);
  }

  startStreaming(interval, arrayLength) {
    const randomArray = Array.from({ length: arrayLength }, () => Math.random());
    let index = 0;

    this.intervalId = setInterval(() => {
      if (index >= randomArray.length) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.listeners.end.forEach(callback => callback()); // 触发 end 事件
        return;
      }

      const data = randomArray[index];
      this.listeners.data.forEach(callback => callback(data)); // 触发 data 事件
      index++;
    }, interval);
  }

  stopStreaming() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.listeners.end.forEach(callback => callback()); // 触发 end 事件
    }
  }
}

// 使用示例
const streamMocker = new StreamMocker();

streamMocker.onData(data => {
  console.log('收到数据:', data);
});

streamMocker.onEnd(() => {
  console.log('数据流结束');
});

streamMocker.startStreaming(1000, 10); // 每秒发送一个随机数，总共发送 10 个随机数

// 在适当的时机调用 stopStreaming 来停止数据流
// streamMocker.stopStreaming();
