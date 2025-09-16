import { _decorator, Component, Node, Label, Button, Sprite, resources, SpriteFrame, UITransform, tween, v3, math, Event, Vec3, Animation, AudioSource, director, sys, ParticleSystem2D, UIOpacity, PhysicsSystem2D } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('questionGameScript')
export default class questionGameScript extends Component {

    ///////////////////////////////////////////////////////////////////////////////////////////

    @property({ type: Node })           //画布节点
    private CanvasNode: Node = null;

    @property({ type: Node })                       //背景图片节点
    private backgroundNode: Node = null;
    private bgSpeed: number = -80;                  //背景图片移动速度
    private bgDrection: Vec3 = new Vec3(1, 0, 0);   //背景移动方向

    @property({type:Node})                   // 开始菜单节点
    private startMenu: Node = null;  
    @property({ type: Node })                //开局倒计时节点
    private startCountDownNode: Node = null;
    private isStartGame: boolean = false;    //是否开始游戏

    ///////////////////////////////////////////////////////////////////////////////////////////

    @property({ type: Node })                   //限制时间板节点
    private limitTimerBoardNode: Node = null;
    @property({ type: Label })                  //倒计时限时秒数Number节点
    private limitTimerNode: Label = null;       
    private limitTime: number = 10;             //总限时时间
    private showingTime: number = 0;            //显示时间
    private adjustTime: number = 0;             //调节用时间

    private limitSetoutTimer: any = null;       //循环计时器
    private isTimerWorking: boolean = false;    //计时器是否在工作中


    @property({ type: Node })                   //反馈板节点
    private feedBackBoardNode: Node = null;
    @property({ type: Label })                  //反馈板文字节点
    private feedBackWordNode: Label = null;
    private feedBackTextSet: string = " ";      //反馈板文字内容

    @property({ type: Node })                   //游戏结束记分板节点
    private gameOverScoreBoardNode: Node = null;
    @property({ type: Label })                  //游戏结束分数文本展示
    private gameOverScoreLabel: Label = null;   

    ///////////////////////////////////////////////////////////////////////////////////////////

    @property({type:Node})
    private randomItemNode: Node = null; // 随机物品父节点

    @property({type:Node})              //Recycle物品节点
    private Recycle: Node = null; 
    @property({ type: Node })           //Harm物品节点
    private Harm: Node = null;
    @property({type:Node})              //Dry物品节点
    private Dry: Node = null;
    @property({type:Node})              //Wet物品节点
    private Wet: Node = null; 

    private itemStorer: number[] = [];  //物品数量存储组
    private itemRecycle:number = 0;     //Recycle物品数量
    private itemHarm:number = 0;        //Harm物品数量
    private itemDry:number = 0;         //Dry物品数量
    private itemWet:number = 0;         //Wet物品数量

    private isSelectingItem: boolean = false;    //是否正在选择物品

    @property({ type: Node })               //剩余物品数量节点
    private restAmountNode: Node = null;
    @property({ type: Label })              //剩余物品数量文本
    private restAmountLabel: Label = null;    

///////////////////////////////////////////////////////////////////////////////////////////

    @property({ type: Node })               //提示按钮
    private hintButton: Node = null;        
    @property({ type: Node })               //提示内容板
    private HintTextBoard: Node = null;     

    @property({ type: Node })               //暂停按钮
    private pauseButton: Node = null;       
    @property({ type: Node })               //暂停菜单节点
    private pauseMenu: Node = null;         

    @property({ type: Node })               //记分板节点
    private scoreBoardNode: Node = null;    
    @property({ type: Label })              //分数节点
    private scoreLabel: Label = null;       
    private score: number = 0;              //分数

    /////////////////////////////////////////////////////////////////////////////////

    @property({type:Node})                 //垃圾桶选项总父节点
    private optionBin: Node = null;

    @property({ type: Node })           //Recycle垃圾桶节点
    private RecycleBin: Node = null;
    @property({ type: Node })           //Harm垃圾桶节点
    private HarmBin: Node = null;
    @property({ type: Node })           //Dry垃圾桶节点
    private DryBin: Node = null;
    @property({ type: Node })           //Wet垃圾桶节点
    private WetBin: Node = null;

    private showItemName:string = " ";     //所选择物品的名称
    private correctOption:number = 0;      //正确答案代码|1=Recycle|2=Harm|3=Dry|4=Wet|
    private selectOption:number = 0;       //所选选项代码

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

    @property({ type: Node })             //第一次文字提示节点
    private firstLabelHint: Node = null;
    @property({ type: Node })             //文字提示节点1
    private LabelHintOne: Node = null;
    @property({ type: Node })             //文字提示节点2
    private LabelHintTwo: Node = null;

    private isLabelHintExist: boolean = false;  //文字提示节点是否存在

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

    @property({ type: Node })                    //更换物品粒子节点
    private changeItemParticle: Node = null;
        
    @property({ type: AudioSource })             //按钮音节点
    private buttonSound: AudioSource = null;
    @property({ type: AudioSource })             //错误提示音节点
    private mistakeSound: AudioSource = null;

    private onceTimergroup: number[] = [];       //单次计时器组节点

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

    onLoad() {
        PhysicsSystem2D.instance.enable = true;    //恢复物理系统
    }

    start() {
        this.initCanvas();              //场景初始化
        this.backgroundMusicPlayer();   //播放背景音乐
        this.hideGameUI();              //隐藏无关UI
        this.isStartGame = false;       //开始游戏状态禁止
        this.startMenu.active = true;   //显示开始菜单
        this.getData();                 //获取数据

        this.forbidBinAct();            //禁止垃圾桶交互
        this.getItemInitialPositon();   //锁定物品初始位置
    }

    update(dt) {

        this.backgroundMove(dt);     //背景图片移动
        this.updateLimitTime(dt);    //持续刷新限制时间
        this.updateFeedback();       //持续更新反馈版显示文本
        this.updateScore();          //持续更新分数
        this.updateRestAmount();     //持续更新剩余物品数量

        this.randomImageShow();      //持续执行随机图片监测
        this.timerSecondMonitor();   //限时计时器监测
        this.limitTimerMonitor();    //超时监测

        this.isSelectComplete();     //持续监测是否全部完成
    }

    onDestroy() {
        for (let allTimer of this.onceTimergroup) {     //清除单次触发计时器组
            clearTimeout(allTimer);
        }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //游戏背景音乐播放器
    backgroundMusicPlayer() {
        this.CanvasNode.getComponent(AudioSource).play();
    }

    //更换物品粒子与音声播放器
    changeItemPlayer() {
        let particle = this.changeItemParticle.getComponent(ParticleSystem2D);
        let sound = this.changeItemParticle.getComponent(AudioSource);

        sound.play();
        particle.resetSystem();
    }

    //按钮音效播放器
    clickButtonSound() {
        this.buttonSound.play();
    }

    //错误提示音播放器
    mistakeSoundPlayer() {
        this.mistakeSound.play();
    }

    //游戏结束音播放器
    gameOverSound() {
        this.gameOverScoreBoardNode.getComponent(AudioSource).play();
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //获取上个场景的游戏数据
    getData() {
        //获取上个场景拾取到的物品数量
        let storeAmount = sys.localStorage.getItem("getAmount");
        this.itemStorer = JSON.parse(storeAmount);          //字符串转换为数组赋值
        this.itemRecycle = this.itemStorer[0];
        this.itemHarm = this.itemStorer[1];
        this.itemDry = this.itemStorer[2];
        this.itemWet = this.itemStorer[3];
        //获取上个场景的分数量
        let storeScore = sys.localStorage.getItem("score");
        this.score = parseInt(storeScore);                  //字符串转为数字赋值
    }

    //场景初始化
    initCanvas() {
        this.CanvasNode.getComponent(UIOpacity).opacity = 0;    //画布节点透明度先设置为0
        tween(this.CanvasNode.getComponent(UIOpacity))          //开屏画面渐现
            .to(1.2, { opacity: 255 })
            .start();
        this.CanvasNode.getComponent(AudioSource).volume = 0.1;   //背景音乐音量先设为0.1
        tween(this.CanvasNode.getComponent(AudioSource))
            .to(2.5, { volume: 0.6 })
            .start();
    }

    //开局倒计时任务
    startCountDown() {
        //间隔时间后启动倒计时动画
        let timerSAni = setTimeout(() => {
            this.startCountDownNode.getComponent(Animation).getState("count").speed = 0.8;
            this.startCountDownNode.getComponent(Animation).play("count");
            this.startCountDownNode.getComponent(AudioSource).play();
            this.onceTimergroup.push(timerSAni);
        }, 250);

        //倒计时动画结束后进入游戏
        let timerS = setTimeout(() => {
            this.showGameUI();          //显示游戏UI界面

            this.firstLabelHint.active = true;  //第一次游戏文字提示显示
            this.LabelHintOne.active = true;    //提示1显示
            this.LabelHintTwo.active = false;   //提示2隐藏
            this.isLabelHintExist = true;       //游戏提示文字存在

            this.isStartGame = true;    //改变为开始游戏状态
            this.onceTimergroup.push(timerS);
        }, 4000);

    }


    // 隐藏指定UI
    hideGameUI() {
        this.scoreBoardNode.active = false;     //记分板隐藏
        this.randomItemNode.active = false;     //随机物品节点隐藏
        this.optionBin.active = false;          //垃圾桶选项节点隐藏
        this.limitTimerBoardNode.active = false;//限时时间板隐藏
        this.feedBackBoardNode.active = false;  //反馈板隐藏
        this.restAmountNode.active = false;     //剩余数量板隐藏


        this.hintButton.active = false;         //提示按钮隐藏
        this.pauseButton.active = false;        //暂停按钮隐藏
    }
    // 显示指定UI
    showGameUI() {
        this.scoreBoardNode.active = true;     //记分板显示
        this.randomItemNode.active = true;     //随机物品节点显示
        this.optionBin.active = true;          //垃圾桶选项节点显示
        this.limitTimerBoardNode.active = true;//限时时间板显示
        this.restAmountNode.active = true;     //剩余数量板显示

        this.hintButton.active = true;         //提示按钮显示
        this.pauseButton.active = true;        //暂停按钮显示
    }

    //背景移动(update)
    backgroundMove(dt) {
        let bgMoveSpeed = this.bgSpeed * dt;        //平衡帧率速度
        this.backgroundNode.setPosition(this.backgroundNode.position.add(new Vec3(bgMoveSpeed, 0, 0)));  //移动背景
        //监测背景并控制循环
        if (this.backgroundNode.position.x < -2300) {
            this.backgroundNode.setPosition(this.backgroundNode.position.add(new Vec3(2300, 0, 0)));
        }
    }

    //范围随机数生成器
    getRandomNumber(max:number,min:number){
        let randomInt=Math.floor(Math.random()*(max - min +1))+min;
        return randomInt;
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //随机图片显示(update)
    randomImageShow() {
        if (this.isStartGame) {
            let selectItem = this.getRandomNumber(4, 1);  //选择1~4数字，定义  |1=Recycle|2=Harm|3=Dry|4=Wet|
            //选择到Recycle
            if (selectItem == 1 && this.itemRecycle != 0 && !this.isSelectingItem) {
                this.Recycle.active = true;     //打开Recycle节点并关闭其他节点
                this.Dry.active = false;
                this.Harm.active = false;
                this.Wet.active = false;
                this.itemRecycle--;             //数量减1
                this.changeItemPlayer();        //播放音声

                this.isSelectingItem = true;    //改变状态，目前正在选择物品中
                this.startLimitTimer();         //开启倒计时
                this.limitTime = 10;

                this.showItemName = "可回收物品";
                this.correctOption = 1;
                this.isAllowSelect = false;                   //禁止选择垃圾桶
            }
            //选择到Harm
            else if (selectItem == 2 && this.itemHarm != 0 && !this.isSelectingItem) {
                this.Harm.active = true;        //打开Harm节点并关闭其他节点
                this.Dry.active = false;
                this.Recycle.active = false;
                this.Wet.active = false;
                this.itemHarm--;                //数量减1
                this.changeItemPlayer();        //播放音声

                this.isSelectingItem = true;    //改变状态，目前正在选择物品中
                this.startLimitTimer();         //开启倒计时
                this.limitTime = 10;

                this.showItemName = "有害垃圾";
                this.correctOption = 2;
                this.isAllowSelect = false;                   //禁止选择垃圾桶
            }
            //选择到Dry
            else if (selectItem == 3 && this.itemDry != 0 && !this.isSelectingItem) {
                this.Dry.active = true;         //打开Dry节点并关闭其他节点
                this.Harm.active = false;
                this.Recycle.active = false;
                this.Wet.active = false;
                this.itemDry--;                 //数量减1
                this.changeItemPlayer();        //播放音声

                this.isSelectingItem = true;    //改变状态，目前正在选择物品中
                this.startLimitTimer();         //开启倒计时
                this.limitTime = 10;

                this.showItemName = "干垃圾";
                this.correctOption = 3;
                this.isAllowSelect = false;                   //禁止选择垃圾桶
            }
            //选择到Wet  
            else if (selectItem == 4 && this.itemWet != 0 && !this.isSelectingItem) {
                this.Wet.active = true;         //打开Wet节点并关闭其他节点
                this.Dry.active = false;
                this.Recycle.active = false;
                this.Harm.active = false;
                this.itemWet--;                  //数量减1
                this.changeItemPlayer();        //播放音声

                this.isSelectingItem = true;    //改变状态，目前正在选择物品中
                this.startLimitTimer();         //开启倒计时
                this.limitTime = 10;

                this.showItemName = "湿垃圾"
                this.correctOption = 4;
                this.isAllowSelect = false;                   //禁止选择垃圾桶
            }
        }
    }

    //选项逻辑判断
    onOptionSelected() {
        if (this.isTimerWorking) {                          //仅在计时器工作时可用
            // 如果选中的选项与正确答案相符
            if (this.selectOption == this.correctOption) {  //正确
                this.score += 20;                           //正确选择，加 2 分
                this.isSelectingItem = false;               //转变选择状态逻辑值，继续进行游戏选择
                this.showingTime = this.limitTime;          //重新赋予时间

                this.returnAllItemBack();                   //将所有物体设置回初始位置
                this.isAllowSelect = false;                 //禁止选择垃圾桶
            }
            //如果选择错误
            else {
                this.feedBackBoardNode.active = true;       //显示反馈板
                this.feedBackTextSet = "选择错误，这应该是" + this.showItemName;      //改变内容
                this.pauseLimitTimer();                     //停止计时器
                this.mistakeSoundPlayer();                  //播放错误音效

                this.returnAllItemTweenBack();              //将所有物体缓动回初始位置
                this.isAllowSelect = false;                 //禁止选择垃圾桶
            }
        }
    }

    //判断物品是否全部选择完毕(update)
    isSelectComplete() {
        if (this.itemRecycle == 0 && this.itemHarm == 0 && this.itemDry == 0 && this.itemWet == 0 && !this.isSelectingItem && this.isStartGame) {
            this.gameOver();
        }
    }

    //更新反馈标签的内容(update)
    updateFeedback() {
        this.feedBackWordNode.string = this.feedBackTextSet;
    }

    //更新分数显示(update)
    updateScore() {
        this.scoreLabel.string = `${this.score}`;
    }

    //更新剩余数量显示(update)
    updateRestAmount() {
        let amount = this.itemRecycle + this.itemHarm + this.itemDry + this.itemWet + 1;
        this.restAmountLabel.string = `${amount}`;
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(计时器逻辑)
    
    //限制时间超时结束持续监测
    limitTimerMonitor() {
        if (this.isTimerWorking) {
            if (this.showingTime <= 0) {
                this.pauseLimitTimer();
                this.feedBackBoardNode.active = true;       //显示反馈板
                this.feedBackTextSet = "时间到，这应该是" + this.showItemName;
                this.mistakeSoundPlayer();                  //播放错误音效
                this.forbidBinAct();                        //禁止垃圾桶交互

                //禁用按钮交互
                this.pauseButton.getComponent(Button).interactable = false;
                this.hintButton.getComponent(Button).interactable = false;

                if (this.isLabelHintExist) {
                    this.firstLabelHint.active = false; //若提示文字还在则隐藏
                }
            }
        }
    }

    //递归计时器
    cycleLimitTimer() {
        if (this.isTimerWorking) {
            this.limitSetoutTimer = setTimeout(() => {
                this.adjustTime += 0.2;     //每0.2s增加调整用时间值0.2
                this.cycleLimitTimer();     //递归调用
            }, 200);
        }
    }

    //限时计时器启动
    startLimitTimer() {
        if (this.showingTime <= 0) this.showingTime = this.limitTime;
        
        if (!this.isTimerWorking) {
            this.isTimerWorking = true;         //开启计时状态
            this.cycleLimitTimer();             //执行循环计时
        }
        
    }

    //限时计时器暂停()
    pauseLimitTimer() {
        this.isTimerWorking = false;            //关闭计时状态
        clearTimeout(this.limitSetoutTimer);    //清除计时器
    }

    //计时器秒数实时监测(update)
    timerSecondMonitor() {
        if (this.isTimerWorking) {
            if (this.adjustTime >= 1) {
                this.showingTime--;
                this.adjustTime = 0;
            }
        }
    }

    //场景限时时间数更新(update)
    updateLimitTime(dt) {
        if (this.isStartGame) { 
            this.limitTimerNode.string = `${this.showingTime}`;
        }
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //选择物品缓动动画

    private itemInitialPos: Vec3 = null;    //物品初始位置
    private currentBinPositon: Vec3 = null; //点击时垃圾桶的位置


    //锁定物体的初始位置
    getItemInitialPositon() {
        let posX = this.Recycle.position.x;
        let posY = this.Recycle.position.y;
        this.itemInitialPos = new Vec3(posX, posY, 0);
    }

    //将所有物品设置回初始位置
    returnAllItemBack() {
        tween(this.Recycle)
            .to(0.01, { position: new Vec3(this.itemInitialPos) })
            .start();
        tween(this.Harm)
            .to(0.01, { position: new Vec3(this.itemInitialPos) })
            .start();
        tween(this.Dry)
            .to(0.01, { position: new Vec3(this.itemInitialPos) })
            .start();
        tween(this.Wet)
            .to(0.01, { position: new Vec3(this.itemInitialPos) })
            .start();
    }

    //将所有物品设置缓动到初始位置
    returnAllItemTweenBack() {
        tween(this.Recycle)
            .to(0.3, { position: new Vec3(this.itemInitialPos) })
            .start();
        tween(this.Harm)
            .to(0.3, { position: new Vec3(this.itemInitialPos) })
            .start();
        tween(this.Dry)
            .to(0.3, { position: new Vec3(this.itemInitialPos) })
            .start();
        tween(this.Wet)
            .to(0.3, { position: new Vec3(this.itemInitialPos) })
            .start();
    }

    //将所有物品设置缓动到指定垃圾桶
    letAllItemTweenToBin() {
        tween(this.Recycle)
            .to(0.5, { position: new Vec3(this.currentBinPositon.x, this.currentBinPositon.y - 300 , 0) })
            .start();
        tween(this.Harm)
            .to(0.5, { position: new Vec3(this.currentBinPositon.x, this.currentBinPositon.y - 300, 0) })
            .start();
        tween(this.Dry)
            .to(0.5, { position: new Vec3(this.currentBinPositon.x, this.currentBinPositon.y - 300, 0) })
            .start();
        tween(this.Wet)
            .to(0.5, { position: new Vec3(this.currentBinPositon.x, this.currentBinPositon.y - 300, 0) })
            .start();
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(clickEvent)

    private isAllowSelect: boolean = false;      //是否允许选择物品

    //开始游戏确认
    onStartGame() {
        this.startMenu.active = false;  // 隐藏开始界面
        this.startCountDown();          //执行开始游戏倒计时
        this.buttonSound.play();        //按钮音
    }

    //允许垃圾桶交互
    allowBinAct() {
        this.RecycleBin.getComponent(Button).interactable = true;  //垃圾桶可交互
        this.HarmBin.getComponent(Button).interactable = true;
        this.DryBin.getComponent(Button).interactable = true;
        this.WetBin.getComponent(Button).interactable = true; 
    }

    //禁止垃圾桶交互
    forbidBinAct() {
        this.RecycleBin.getComponent(Button).interactable = false;  //垃圾桶不可交互
        this.HarmBin.getComponent(Button).interactable = false;
        this.DryBin.getComponent(Button).interactable = false;
        this.WetBin.getComponent(Button).interactable = false; 
    }

    //点击垃圾进入选项判断
    clickItemToJudge() {
        if (!this.isAllowSelect) {
            if (this.isLabelHintExist) {            //若存在文字提示
                this.LabelHintOne.active = false;   //第一次点击后隐藏提示1
                this.LabelHintTwo.active = true;    //显示提示2
            }
            this.Recycle.position.add(new Vec3(0, 20, 0));
            this.Harm.position.add(new Vec3(0, 20, 0));
            this.Dry.position.add(new Vec3(0, 20, 0));
            this.Wet.position.add(new Vec3(0, 20, 0));
            this.isAllowSelect = true;              //允许选择
            this.randomItemNode.getComponent(AudioSource).play();   //播放音效

            this.allowBinAct();    //允许垃圾桶交互
        }
    }

    //选择可回收
    selectRecycle(){
        if (this.isAllowSelect) {
            if (this.isLabelHintExist) {            //若存在文字提示
                this.LabelHintTwo.active = false;   //点击后隐藏提示2
                this.isLabelHintExist = false;      //取消存在状态
            }
            this.currentBinPositon = this.RecycleBin.position;  //更改目标垃圾桶位置
            this.optionBin.getComponent(AudioSource).play();    //播放音效
            this.letAllItemTweenToBin();     //执行缓动动画

            this.forbidBinAct();        //禁止垃圾桶交互
            //动画结束后进行判断
            let timerSR = setTimeout(() => {
                this.selectOption = 1;
                this.onOptionSelected();
                this.onceTimergroup.push(timerSR);
            }, 500);
        }
    }
     //选择有害
    selectHarm(){
        if (this.isAllowSelect) {
            if (this.isLabelHintExist) {            //若存在文字提示
                this.LabelHintTwo.active = false;   //点击后隐藏提示2
                this.isLabelHintExist = false;      //取消存在状态
            }
            this.currentBinPositon = this.HarmBin.position;  //更改目标垃圾桶位置
            this.optionBin.getComponent(AudioSource).play();    //播放音效
            this.letAllItemTweenToBin();     //执行缓动动画

            this.forbidBinAct();        //禁止垃圾桶交互
            //动画结束后进行判断
            let timerSH = setTimeout(() => {
                this.selectOption = 2;
                this.onOptionSelected();
                this.onceTimergroup.push(timerSH);
            }, 500);
        }
    }
     //选择干垃圾
    selectDry(){
        if (this.isAllowSelect) {
            if (this.isLabelHintExist) {            //若存在文字提示
                this.LabelHintTwo.active = false;   //点击后隐藏提示2
                this.isLabelHintExist = false;      //取消存在状态
            }
            this.currentBinPositon = this.DryBin.position;  //更改目标垃圾桶位置
            this.optionBin.getComponent(AudioSource).play();    //播放音效
            this.letAllItemTweenToBin();     //执行缓动动画

            this.forbidBinAct();        //禁止垃圾桶交互
            //动画结束后进行判断
            let timerSD = setTimeout(() => {
                this.selectOption = 3;
                this.onOptionSelected();
                this.onceTimergroup.push(timerSD);
            }, 500);
        }
    }
    //选择湿垃圾
    selectWet(){
        if (this.isAllowSelect) {
            if (this.isLabelHintExist) {            //若存在文字提示
                this.LabelHintTwo.active = false;   //点击后隐藏提示2
                this.isLabelHintExist = false;      //取消存在状态
            }
            this.currentBinPositon = this.WetBin.position;  //更改目标垃圾桶位置
            this.optionBin.getComponent(AudioSource).play();    //播放音效
            this.letAllItemTweenToBin();     //执行缓动动画

            this.forbidBinAct();        //禁止垃圾桶交互
            //动画结束后进行判断
            let timerSW = setTimeout(() => {
                this.selectOption = 4;
                this.onOptionSelected();
                this.onceTimergroup.push(timerSW);
            }, 500);
        }
    }

    //点击提示按钮
    clickHintButton() {
        if (this.isLabelHintExist) {
            this.firstLabelHint.active = false; //若提示文字还在则隐藏
        }

        this.HintTextBoard.active = true;   //打开提示面板
        this.hintButton.active = false;     //隐藏提示按钮
        this.pauseButton.active = false;    //隐藏暂停游戏按钮
        this.optionBin.active = false;      //垃圾桶选项隐藏
        this.pauseLimitTimer();             //禁止计时器工作
        this.buttonSound.play();            //按钮音
    }

    //点击确认提示内容按钮
    clickHintOkButton() {       
        if (this.isLabelHintExist) {
            this.firstLabelHint.active = true; //若提示文字还在则显示
        }

        this.HintTextBoard.active = false;  //关闭提示面板
        this.pauseButton.active = true;    //显示暂停游戏按钮
        this.hintButton.active = true;      //显示提示按钮
        this.optionBin.active = true;      //垃圾桶选项显示
        this.startLimitTimer();             //允许计时器工作
        this.buttonSound.play();            //按钮音
    }

    //失败 & 超时后点击继续游戏按钮
    clickContinueButton() {
        if (this.isLabelHintExist) {
            this.firstLabelHint.active = true; //若提示文字还在则显示
        }
        //允许按钮交互
        this.pauseButton.getComponent(Button).interactable = true;
        this.hintButton.getComponent(Button).interactable = true;

        this.feedBackBoardNode.active = false;  //反馈板隐藏
        this.returnAllItemBack();               //归位物品
        this.isSelectingItem = false;           //改变到未选择物品状态中，继续游戏
        this.showingTime = this.limitTime;      //重新赋予时间
        this.buttonSound.play();                //按钮音
    }

    //点击暂停游戏按钮
    clickPauseButton() {
        if (this.isLabelHintExist) {
            this.firstLabelHint.active = false; //若提示文字还在则隐藏
        }

        this.pauseButton.active = false;        //隐藏暂停游戏按钮
        this.hintButton.active = false;         //隐藏提示按钮
        this.optionBin.active = false;          //垃圾桶选项隐藏
        this.pauseMenu.active = true;           //打开暂停菜单
        this.pauseLimitTimer();                 //暂停计时器工作
        this.buttonSound.play();                //按钮音
    }

    //暂停菜单点击返回游戏按钮
    clickBackToGameButton() {
        if (this.isLabelHintExist) {
            this.firstLabelHint.active = true; //若提示文字还在则显示
        }

        this.pauseButton.active = true;         //显示暂停游戏按钮
        this.hintButton.active = true;          //显示提示按钮
        this.optionBin.active = true;           //垃圾桶选项显示
        this.pauseMenu.active = false;          //关闭暂停菜单
        this.startLimitTimer();                 //恢复计时器工作
        this.buttonSound.play();                //按钮音
    }

    //暂停菜单点击返回主页按钮
    clickBackToMenuButton() {
        director.loadScene("menu");             //加载场景“menu”
        this.buttonSound.play();                //按钮音
    }

    //点击游戏结束再来一次按钮
    clickPlayAgainButton() {
        director.loadScene("collectGame");      //加载场景"game"
        this.buttonSound.play();                //按钮音
    }

    //查看攻略按钮点击
    clickCheckTheGuideButton() {
        this.buttonSound.play();                //按钮音
        this.pauseMenu.active = false;          //关闭暂停菜单
        this.TipBorad.active = true;            //游戏帮助界面开启
        this.tipBorad1.active = true;           //打开第一页
    }

    //点击游戏结束返回标题按钮
    clickBackToTitleButton() {
        director.loadScene("menu");             //加载场景"menu"
        this.buttonSound.play();                //按钮音
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(查看帮助内容)

    @property({ type: Node })               //获取总帮助父节点
    private TipBorad: Node = null;

    @property({ type: Node })               //获取第一页节点
    private tipBorad1: Node = null;
    @property({ type: Node })               //获取第二页节点
    private tipBorad2: Node = null;
    @property({ type: Node })               //获取第三页节点
    private tipBorad3: Node = null;
    @property({ type: Node })               //获取第四页节点
    private tipBorad4: Node = null;


    //第一页翻页
    P1Button() {
        this.buttonSound.play();                //按钮音
        this.tipBorad1.active = false;           //第一页隐藏
        this.tipBorad2.active = true;            //第二页开启
    }

    //第二页返回
    P2backButton() {
        this.buttonSound.play();                //按钮音
        this.tipBorad2.active = false;           //第二页隐藏
        this.tipBorad1.active = true;            //第一页开启
    }

    //第二页翻页
    P2nextButton() {
        this.buttonSound.play();                //按钮音
        this.tipBorad2.active = false;           //第二页隐藏
        this.tipBorad3.active = true;            //第三页开启
    }

    //第三页返回
    P3backButton() {
        this.buttonSound.play();                //按钮音
        this.tipBorad3.active = false;           //第三页隐藏
        this.tipBorad2.active = true;            //第二页开启
    }

    //第三页翻页
    P3nextButton() {
        this.buttonSound.play();                //按钮音
        this.tipBorad3.active = false;           //第三页隐藏
        this.tipBorad4.active = true;            //第四页开启
    }

    //第四页返回
    P4backButton() {
        this.buttonSound.play();                //按钮音
        this.tipBorad4.active = false;           //第四页隐藏
        this.tipBorad3.active = true;            //第三页开启
    }
    //确定按钮
    ClickConfirmButton() {
        this.buttonSound.play();                //按钮音
        this.TipBorad.active = false;           //帮助页面隐藏
        this.tipBorad1.active = true;           //第一页开启
        this.tipBorad2.active = true;           //第二页开启
        this.tipBorad3.active = true;           //第三页开启
        this.tipBorad4.active = true;           //第四页开启
        this.pauseMenu.active = true;           //打开暂停菜单
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //游戏结束函数
    gameOver() {
        this.isStartGame = false;   //切换状态为结束
        this.hideGameUI();          //隐藏UI
        this.pauseLimitTimer();     //停止计时器
        this.gameOverScoreBoardNode.active = true   //展示游戏结束记分板
        this.gameOverScoreLabel.string = "您的得分为:" + this.score;
        this.gameOverSound();       //播放结束音效
    }

}