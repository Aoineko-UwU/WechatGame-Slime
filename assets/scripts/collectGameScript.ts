import { _decorator, Animation, AudioSource, BoxCollider2D, Collider2D, Component, Contact2DType, EPhysics2DDrawFlags, Input, input, instantiate, Label, math, Node, PhysicsSystem2D, Prefab, ProgressBar, RigidBody2D, tween, UIOpacity, Vec2, Vec3, ParticleSystem2D, director, sys, PrivateNode, Button, macro } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('collectGameScript')
export class collectGameScript extends Component {

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(预加载-类缓存变量)

    private itemGetP: ParticleSystem2D = null;  //拾取废品粒子组
    private itemGetA: AudioSource = null;       //拾取废品音效组

    private pSlideP: ParticleSystem2D = null;   //角色滑铲粒子组
    private pSlideA: AudioSource = null;        //角色滑铲音效组

    private blockP: ParticleSystem2D = null;   //方块破坏粒子组
    private blockA: AudioSource = null;        //方块破坏音效组

    private pJumpChargeP: ParticleSystem2D = null;   //角色蓄力跳跃粒子组
    private pJumpChargeA: AudioSource = null;        //角色蓄力跳跃音效组

    private pAnimation: Animation = null;   //角色动画组
    private pRigidBody: RigidBody2D = null; //角色刚体组


    private healthA: AudioSource = null;    //生命值音效组

    private invincibleP: ParticleSystem2D = null;   //无敌粒子组
    private invincibleA: AudioSource = null;        //无敌音效组

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////

    onLoad() {
        PhysicsSystem2D.instance.enable = true;    //恢复物理系统
        this.pAnimation = this.playerNode.getComponent(Animation);   //加载角色动画
        this.pRigidBody = this.playerNode.getComponent(RigidBody2D); //加载角色刚体

        this.itemGetP = this.itemGetParticle.getComponent(ParticleSystem2D);    //加载废品拾取粒子
        this.itemGetA = this.itemGetParticle.getComponent(AudioSource);         //加载废品拾取音效

        this.pSlideP = this.slideParticle.getComponent(ParticleSystem2D);   //加载滑铲粒子
        this.pSlideA = this.slideParticle.getComponent(AudioSource);        //加载滑铲音效

        this.blockA = this.hitBlockParticle.getComponent(AudioSource);      //加载方块破坏音效
        this.blockP = this.hitBlockParticle.getComponent(ParticleSystem2D); //加载方块破坏粒子

        this.pJumpChargeP = this.jumpChargedParticle.getComponent(ParticleSystem2D);    //加载跳跃蓄力粒子
        this.pJumpChargeA = this.jumpChargedParticle.getComponent(AudioSource);         //加载跳跃蓄力音效


        this.invincibleP = this.invincibleEffectParticle.getComponent(ParticleSystem2D)    //加载无敌粒子
        this.invincibleA = this.playerNode.getComponent(AudioSource);                      //加载无敌音效

        this.healthA = this.healthNode.getComponent(AudioSource);       //加载生命值音效
    }

    start() {
        this.hideUI();                 //隐藏无关UI
        this.initCanvas();             //场景初始化
        this.showHintBoard();          //显示提示板
        this.initHealth();             //生命值初始化

        this.audioPlayer();            //播放游戏音频
   
        this.showDebug();              //打开碰撞箱显示
    }

    update(dt) {
        //当游戏未暂停时执行以下方法，暂停则不执行
        if (!this.isPausingGame) {
            this.groundMove(dt);        //地面移动更新
            this.backgroundMove(dt);    //背景移动更新

            this.ItemMove(dt);          //随机物品移动更新
            this.BlockMove(dt);         //随机方块移动更新
            this.isLongTap();           //监测是否长按屏幕
            this.incrJumpBar();         //长按增加跳跃条
            this.noTouchingClear();     //未触摸跳跃条清除
            this.jumpHandler();         //跳跃过程监测 
            this.slideHandler();        //滑铲过程检测
        }

        this.confirmIPspawn();              //确认无敌道具可刷新
        this.PropOutCheck();                //道具出界监测
        this.pickInvincibleProp()           //拾取无敌道具监测
        this.invinciblePropFalledCheck();   //无敌道具落地监测
        this.checkInvincibleEffectOver();   //无敌状态结束监测

        this.timerSecondMonitor();  //时间更新监测
        this.updateGameTime();      //时间字符串显示持续更新    
        this.updateScore();         //更新所有分数显示

        this.pickItem();            //收集物品监测
        this.HitBlock();            //碰撞方块监测

        this.healthUpdate();        //生命值监测更新

        this.setJumpChargedParticlePos();   //持续设置跳跃蓄力粒子位置
        this.setSlideParticlePos();         //持续设置角色滑铲粒子位置
        this.setInvincibleParticlePos();    //持续设置角色无敌粒子位置
    }

    onDestroy() {
        this.closeTouchEvent()          // 清理事件监听器
        this.unscheduleAllCallbacks();  //清理所有的计时器

    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(杂项)

    @property({ type: Node })               //收集物品数量总节点
    private getItemAmountNode: Node = null;
    @property({ type: Label })              //收集数量节点
    private itemAmountNode: Label = null;
    @property({ type: Node })               //记分板总节点
    private scoreBoardNode: Node = null;
    @property({ type: Label })              //分数节点
    private scoreNode: Label = null;
    private score: number = 0;              //玩家分数

    @property
    private isDebug: boolean = false;       //碰撞箱调试(可选)


    //获取整数随机值函数(最小 - 最大)
    getRandomInt(min: number, max: number) {
        let random: number = Math.floor(Math.random() * (max - min + 1)) + min;
        return random;
    }

    //获取浮点数随机值函数(最小 - 最大)
    getRandomFloat(min: number, max: number): number {
        let randomNum = Math.random() * (max - min) + min;
        return parseFloat(randomNum.toFixed(1));    //修复输出为保留1位小数
    }

    //显示相关UI
    showUI() {
        this.countDownShow.active = true;       //显示倒计时节点
        this.JumpBarOpaSetNode.active = true;   //显示跳跃条节点
        this.healthNode.active = true;          //显示血量条节点
        this.getItemAmountNode.active = true;   //显示获取物品数量板节点
        this.scoreBoardNode.active = true;      //显示记分板节点
        this.pauseButtonNode.active = true;     //显示暂停按钮节点
    }

    //隐藏相关UI
    hideUI() {
        this.invincibleUINode.active = false;    //隐藏无敌UI节点
        this.countDownShow.active = false;       //隐藏倒计时节点
        this.JumpBarOpaSetNode.active = false;   //隐藏跳跃条节点
        this.healthNode.active = false;          //隐藏血量条节点
        this.getItemAmountNode.active = false;   //隐藏获取物品数量板节点
        this.scoreBoardNode.active = false;      //隐藏记分板节点
        this.pauseButtonNode.active = false;     //隐藏暂停按钮节点
        this.pauseMenuBoardNode.active = false;  //隐藏暂停按钮菜单面板
        this.TipBorad.active = false;            //帮助页面隐藏
    }

    //物理碰撞箱信息绘制
    showDebug() {
        if (this.isDebug) {
            PhysicsSystem2D.instance.debugDrawFlags =
                EPhysics2DDrawFlags.Aabb |
                EPhysics2DDrawFlags.Pair |
                EPhysics2DDrawFlags.CenterOfMass |
                EPhysics2DDrawFlags.Joint |
                EPhysics2DDrawFlags.Shape;
        } else {
            PhysicsSystem2D.instance.debugDrawFlags =
                EPhysics2DDrawFlags.None;
        }
    }

    //更新游戏分数显示(update)
    updateScore() {
        const amount = this.getRecs + this.getHars + this.getDrys + this.getWets;
        this.scoreNode.string = `${this.score}`;
        this.itemAmountNode.string = `${amount}`;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(场景初始)

    @property({ type: Node })          //开局提示框节点
    private HintBoardNode: Node = null;
    @property({ type: Node })          //画布节点
    private canvasNode: Node = null;
    @property({ type: Node })          //开局倒计时节点
    private countNode: Node = null;


    //场景进入初始化(start)
    initCanvas() {
        this.canvasNode.getComponent(UIOpacity).opacity = 0;    //画布节点透明度先设置为0
        tween(this.canvasNode.getComponent(UIOpacity))          //开屏画面渐现
            .to(1, { opacity: 255 })
            .start();
    }

    //初始提示框显示(start)
    showHintBoard() {
        tween(this.HintBoardNode.getComponent(UIOpacity))   //提示框渐显
            .to(1.2, { opacity: 255 })
            .start();
    }


    //开局倒计时显示
    countShow() {
        //播放动画和音效
        this.countNode.getComponent(Animation).getState("count").speed = 0.8;
        this.countNode.getComponent(Animation).play("count");
        this.countNode.getComponent(AudioSource).play();
    } 

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(计时器逻辑)

    @property({ type: Node })               //总倒计时显示节点
    private countDownShow: Node = null;
    @property({ type: Label })              //总倒计时节点
    private countDownNumber: Label = null;
    private gameTime: number = 60;          //局内总游戏时间(倒计时参数)
    private showingTime: number = 0;        //显示时间
    private adjustTime: number = 0;         //调节用时间

    private perSecondIncrScore: number = 5; //每秒获得的分数

    private gameTimer: any = null;              //游戏递归计时器
    private isTimerWorking: boolean = false;    //计时器是否在工作中

    //递归计时器
    cycleLimitTimer() {
        //仅在计时器工作的状态下执行
        if (this.isTimerWorking) {
            this.gameTimer = this.scheduleOnce(() => {
                this.adjustTime += 0.2;     //每0.2s增加调整用时间值0.2
                this.cycleLimitTimer();     //递归调用
                //无敌状态下加分
                if (this.isPlayerGettingIPeffect && !this.isGameOver) {
                    this.score += this.IPincrScore
                }    
            }, 0.2);
        }
    }

    //游戏计时器启动
    startGameTimer() {
        //初始化显示游戏时间
        if (this.showingTime <= 0) this.showingTime = this.gameTime;
        //当计时器处于未工作状态时执行
        if (!this.isTimerWorking) {
            this.isTimerWorking = true;     //开启计时状态
            this.cycleLimitTimer();         //执行循环计时
        }

    }

    //游戏计时器暂停
    pauseGameTimer() {
        this.isTimerWorking = false;        //关闭计时状态
        this.unschedule(this.gameTimer);    //清除游戏计时器
    }

    //计时器秒数实时监测(update)
    timerSecondMonitor() {
        //仅在计时器处于工作状态时执行
        if (this.isTimerWorking) {
            //监测调节时间大于1时，显示时间-1s
            if (this.adjustTime >= 1) {
                this.showingTime--;             //显示时间减1s       
                this.adjustTime = 0;            //将监测时间归零以便重复计算
                this.propSpawnLimitTime++;      //道具刷新阈值时间加1s

                //无敌时间存在时,.每秒效果时间-1s
                if (this.invincibleEffectTime > 0) this.invincibleEffectTime--; 
                //游戏未结束时，每秒获得分数
                if (!this.isGameOver) this.score += this.perSecondIncrScore;    
            }
            //监测游戏时间为0时，结束游戏
            if (this.showingTime <= 0) {
                this.isTimerWorking = false;        //关闭计时工作状态
                this.updateGameTime();              //更新一次游戏时间
                this.unschedule(this.gameTimer);    //清除游戏计时器
                this.gameOver();                    //执行游戏结束函数
            }
        }
    }

    //场景时间字符串更新(update)
    updateGameTime() {
        //游戏未结束时持续更新时间数字显示
        if (!this.isGameOver) {             
            this.countDownNumber.string = `${this.formatTime(this.showingTime)}`;
        }
    }

    //转换倒计时显示时间为(00)格式
    formatTime(time: number): string {
        return time < 10 ? `0${time}` : `${time}`;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(生命值)

    @property({ type: Node })               //生命值UI总节点
    private healthNode: Node = null;
    private health: number = 3;             //生命值
    private healthContainer: Node[] = [];   //生命值节点容器

    private healthID01: Node = null;        //生命值1 ID
    private healthID02: Node = null;        //生命值2 ID
    private healthID03: Node = null;        //生命值3 ID

    private healthCheck3: boolean = false;  //生命值监测3
    private healthCheck2: boolean = false;  //生命值监测2
    private healthCheck1: boolean = false;  //生命值监测1

    //生命条初始化(start)
    initHealth() {
        this.healthContainer = this.healthNode.children;    //将子节点存进容器
        this.getHealthId();                                 //获取生命值ID

    }

    //获取生命值ID并存储
    getHealthId() {
        this.healthContainer.forEach(heal => {  //遍历父节点
            let healthId = heal.name;           //设置ID匹配函数并记录生命值ID
            switch (healthId) {
                case "heart01":
                    this.healthID01 = heal;
                    break;
                case "heart02":
                    this.healthID02 = heal;
                    break;
                case "heart03":
                    this.healthID03 = heal;
                    break;
            }
        });
    }

    //生命值监测计算(update)
    healthUpdate() {
        //当生命值为2且监测未扣除生命值时执行
        if (this.health == 2 && this.healthCheck3 == false) {
            this.healthA.play();
            tween(this.healthID03.getComponent(UIOpacity))
                .to(0.2, { opacity: 0 })           //血条格子渐隐
                .start();
            this.healthCheck3 = true;              //转为真值防止重复执行
        }
        //生命值为1时...
        else if (this.health == 1 && this.healthCheck2 == false) {
            this.healthA.play();
            tween(this.healthID02.getComponent(UIOpacity))
                .to(0.2, { opacity: 0 })
                .start();
            this.healthCheck2 = true;
        }
        //生命值为0时......
        else if (this.health == 0 && this.healthCheck1 == false) {
            this.healthA.play();
            tween(this.healthID01.getComponent(UIOpacity))
                .to(0.2, { opacity: 0 })
                .start();
            this.healthCheck1 = true;
            //生命值为0时若此时游戏还未结束，则执行结束
            if (!this.isGameOver) { this.gameOver(); }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(屏幕输入事件监听)

    @property({ type: Node })                //总跳跃条节点
    private JumpBarOpaSetNode: Node = null;
    @property({ type: Node })                //跳跃条节点
    private JumpBar: Node = null;

    @property({ type: AudioSource })         //短跳音效
    private jumpShortSound: AudioSource = null;
    @property({ type: AudioSource })         //长跳音效
    private jumpLongSound: AudioSource = null;

    private touchStartTime: number = 0;      // 触摸开始的时间
    private touchDuration: number = 0;       // 触摸持续时间
    private isTouching: boolean = false;     // 是否正在触摸
    private pressTime: number = 0;           // 长按时间


    //启用触摸操控监测
    openTouchEvent() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }
    //禁用触摸操控监测
    closeTouchEvent() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    // 记录触摸开始的时间
    onTouchStart() {
        this.touchStartTime = Date.now();   //记录触摸开始时间
        this.isTouching = true;             //设置为开始触摸
    }
    //触摸结束事件分支
    onTouchEnd() {
        //仅在触摸状态且角色为默认移动状态时触发
        if (this.isTouching && this.playerState == 0) {
            this.touchDuration = (Date.now() - this.touchStartTime) / 1000; // 转换为秒，便于后续设置判断
            //判断长按时间以进行不同阈值动作执行
            if (this.touchDuration >= 0.2 && this.touchDuration < 0.35) {
                this.jumpSpeedSave = this.jumpSpeed + 10;   //改变跳跃速度
                this.playerJump();                          //执行角色跳跃
                this.jumpShortSound.play();                 //播放短跳音效               
            }
            else if (this.touchDuration >= 0.35 && this.touchDuration < 0.5) {
                this.jumpSpeedSave = this.jumpSpeed + 25;   //改变跳跃速度
                this.playerJump();                          //执行角色跳跃
                this.jumpShortSound.play();                 //播放短跳音效 
            }
            else if (this.touchDuration >= 0.5 && this.touchDuration < 0.65) {
                this.jumpSpeedSave = this.jumpSpeed + 38;   //改变跳跃速度
                this.playerJump();                          //执行角色跳跃
                this.jumpLongSound.play();                  //播放长跳音效
            }
            else if (this.touchDuration >= 0.65) {
                this.jumpSpeedSave = this.jumpSpeed + 50;   //改变跳跃速度
                this.playerJump();                          //执行角色跳跃
                this.jumpLongSound.play();                  //播放长跳音效
            }
            //否则执行滑铲动作
            else {  
                this.playerSlide();      //执行角色滑铲
                this.slidePlayer();      //滑铲效果播放器
            }

            //默认必定执行内容
            this.isTouching = false;     //取消点击状态
            this.isRepeatPlay = false;   //关闭跳跃粒子重复播放
        }
    }
    //触摸被取消时，重置状态
    onTouchCancel() {
        this.isTouching = false;        //取消点击状态
        this.isRepeatPlay = false;      //关闭重复播放
        this.unschedule(this.repeatPlayTimer)   //清除循环粒子计时器
    }


    //跳跃条初始化
    initJumpBar() {
        let initJumpBarProgress = this.JumpBar.getComponent(ProgressBar);
        initJumpBarProgress.progress = 0;
    }

    //长按屏幕增加跳跃条
    incrJumpBar() {
        if (this.isTouching && this.playerState == 0) {
            this.touchDuration = (Date.now() - this.touchStartTime) / 1000;
            let JumpBarProgress = this.JumpBar.getComponent(ProgressBar);
            if (this.touchDuration >= 0.2 && this.touchDuration < 0.35) {
                JumpBarProgress.progress = 0.25;
            } else if (this.touchDuration >= 0.35 && this.touchDuration < 0.5) {
                JumpBarProgress.progress = 0.5;
            } else if (this.touchDuration >= 0.5 && this.touchDuration < 0.65) {
                JumpBarProgress.progress = 0.75;
            } else if (this.touchDuration >= 0.65) {
                JumpBarProgress.progress = 1;
            }
        }
    }

    //未触摸时直接清空跳跃条
    noTouchingClear() {
        if (!this.isTouching) {
            let JumpBarProgress = this.JumpBar.getComponent(ProgressBar);
            JumpBarProgress.progress = 0;
        }
    }


    //长按屏幕判断函数(update)
    isLongTap() {
        //仅在点击屏幕状态生效
        if (this.isTouching) {
            this.pressTime += 0.05;
            //仅在 | 按压时长大于0.2 && 不在蓄力状态中 && 进度条>=50% && 角色状态为默认状态 | 的情况执行
            if (this.pressTime >= 0.2 && this.isRepeatPlay == false && this.JumpBar.getComponent(ProgressBar).progress >= 0.5 && this.playerState == 0) {
                this.isRepeatPlay = true;   //改变状态为开始蓄力
                this.jumpChargedPlayer();   //先执行一次跳跃蓄力粒子音声
                this.jumpChargedRepeat();   //执行蓄力重复动画
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(玩家角色)

    @property({ type: Node })               //玩家节点
    private playerNode: Node = null;
    private playerState: number = 0;        //角色状态【 0:角色默认移动 | 1：角色跳跃 |2：角色滑铲 】
    private jumpSpeed: number = 30;         //角色跳跃速度基值
    private jumpSpeedSave: number = 0;      //角色跳跃速度存储
    private slideSpeed: number = 20;        //角色滑铲速度

    private isInvincible: boolean = false;  //是否无敌

    //角色初始化
    initPlayer() {     
        this.playerMove();      //设置默认移动动画

        //开局缓动动画设置
        tween(this.pRigidBody)
            .to(1.5, { linearVelocity: new Vec2(13, 0) })
            .start();

        //1.5s后回到角色固定位置
        this.scheduleOnce(() => {
            tween(this.playerNode)
                .to(0.3, { position: new Vec3(-260, -448, 0) })
                .start();
        }, 1.5);
    }

    //角色移动
    playerMove() {
        //播放移动动画
        this.pAnimation.getState("slimeMove").speed = 1;
        this.pAnimation.play("slimeMove");
    }

    //角色跳跃
    playerJump() {
        if (this.playerState != 0) return;
        this.playerState = 1;   //改变角色状态为跳跃
        //赋予刚体y轴线性速度
        this.pRigidBody.linearVelocity = new Vec2(0, this.jumpSpeedSave);
        //播放跳跃动画
        this.pAnimation.getState("slimeJump").speed = 1;
        this.pAnimation.play("slimeJump");

        this.unschedule(this.repeatPlayTimer);  //清除蓄力粒子音声重复播放
    }

    //角色滑铲
    playerSlide() {
        if (this.playerState != 0) return;
        this.playerState = 2;       //改变角色状态为滑铲
        this.isInvincible = true;   //设置角色状态为无敌
        //赋予刚体x轴线性速度
        this.pRigidBody.linearVelocity = new Vec2(this.slideSpeed, 0);
        //播放滑铲动画
        this.pAnimation.getState("slimeSlide").speed = 1;
        this.pAnimation.play("slimeSlide");
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(玩家跳跃与滑铲监测)

    @property({ type: Node })               //拾取物品粒子节点
    private itemGetParticle: Node = null;
    @property({ type: Node })               //角色滑铲粒子节点
    private slideParticle: Node = null;
    @property({ type: Node })               //无敌效果粒子节点
    private invincibleEffectParticle: Node = null;  
    @property({ type: Node })               //跳跃蓄力粒子节点
    private jumpChargedParticle: Node = null;

    private isFalling: boolean = false;     //玩家是否正在降落检测
    private isRepeatPlay: boolean = false;  //跳跃蓄力粒子节点是否重复播放
    private repeatPlayTimer: any = null;    //重复播放计时器

    //角色跳跃蓄力循环播放器
    jumpChargedRepeat() {
        //仅在允许重复播放的情况下执行
        if (this.isRepeatPlay) {            
            this.jumpChargedPlayer();
            this.repeatPlayTimer = this.scheduleOnce(this.jumpChargedRepeat, 1.5);
        }
    }
    //循环播放的角色跳跃蓄力粒子与音声设置
    jumpChargedPlayer() {
        this.pJumpChargeA.volume = 0.3;     //修改音量
        this.pJumpChargeA.play();           //播放音效
        this.pJumpChargeP.resetSystem();    //播放粒子
    }
    //设置跳跃蓄力粒子位置(update)
    setJumpChargedParticlePos() {
        //设置释放粒子位置
        this.jumpChargedParticle.setPosition(new Vec3(this.playerNode.position.x + 360, this.playerNode.position.y + 640, 0));  
    }


    //角色跳跃落地碰撞检测
    jumpHandler() {
        //仅在角色跳跃状态执行
        if (this.playerState == 1) {
            let JumpBarProgress = this.JumpBar.getComponent(ProgressBar);
            let posY = this.playerNode.position.y;
            //若到达至高点
            if (this.pRigidBody.linearVelocity.y < 0 && !this.isFalling) {
                this.isFalling = true;          //改变为正在下落状态
            }
            //若落地
            if (this.pRigidBody.linearVelocity.y > -0.2 && this.isFalling && posY < -450) {
                this.playerMove();              //播放移动动画
                this.playerState = 0;           //角色状态为默认
                this.isFalling = false;         //改变为未下落状态
                JumpBarProgress.progress = 0;   //跳跃条归零
            }
        }
    }

    //角色滑铲状态检测(update)
    slideHandler() {
        if (this.playerState == 2) {
            this.isTouching = false;
            if (this.pRigidBody.linearVelocity.x < 2) {
                tween(this.playerNode)
                    .to(0.3, { position: new Vec3(-260, -448, 0) })
                    .start();

                this.playerMove();          //运行移动逻辑
                this.playerState = 0;       //恢复玩家状态为移动
                if (!this.isPlayerGettingIPeffect) {
                    this.isInvincible = false;      //若玩家不处于无敌道具状态中，则关闭无敌效果
                }
            }
        }
    }

    //角色滑铲粒子与音声播放器
    slidePlayer() {
        this.pSlideA.play();
        this.pSlideP.resetSystem();
    }

    //角色滑铲粒子位置持续更新(update)
    setSlideParticlePos() {
        //设置释放粒子位置
        this.slideParticle.setPosition(new Vec3(this.playerNode.position.x + 340, this.playerNode.position.y + 620, 0));  
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(随机废品生成)

    @property({ type: Node })               //随机废品生成节点
    private randomItemNode: Node = null;
    @property({ type: Prefab })             //预制体Recycle
    private rIRec: Prefab = null;
    @property({ type: Prefab })             //预制体Harm
    private rIHar: Prefab = null;
    @property({ type: Prefab })             //预制体Dry
    private rIDry: Prefab = null;
    @property({ type: Prefab })             //预制体Wet
    private rIWet: Prefab = null;
    private itemColliderStorer: Collider2D[] = [];   //存储所有预制体废品的碰撞箱

    private getRecs: number = 0;            //收集到的Recycle数量
    private getHars: number = 0;            //收集到的Harm数量
    private getDrys: number = 0;            //收集到的Dry数量
    private getWets: number = 0;            //收集到的Wet数量

    private itemIncrScore: number = 20;            //收集垃圾时的得分

    private rImoveSpeed: number = -3;              //废品移动速度（固定，向量）

    private rIspawnMinTime: number = 1.5;          //生成物体的最小间隔时间(Float/s)
    private rIspawnMaxTime: number = 3.5;          //生成物体的最大间隔时间(Float/s)

    private isStartRandomSpawn: boolean = false;   //启用随机时间范围生成逻辑判断值

    private rIspawnMinHeight: number = 100;        //生成物体的最低高度
    private rIspawnMaxHeight: number = 800;        //生成物体的最高高度

    private RITotalAmount: number = 0;             //场景中废品总数
    private MaxRIAmount: number = 3;               //场景中允许存在的最大物品数量

    private RItimer: any = null;    //RI指定计时器



    //随机时间生成物品事件确认
    confirmRandomSpawn() {
        if (!this.isStartRandomSpawn) {
            this.isStartRandomSpawn = true;
            this.randomTimeSpawn();
        }
    }

    //随机时间范围中循环生成废品
    randomTimeSpawn() {
        if (this.isStartRandomSpawn) {
            this.invinciblePropSpawn();     //进行生成无敌道具的操作流程
            //场景中物品数小于限制数量时，启用生成随机物品
            if (this.RITotalAmount <= this.MaxRIAmount) {
                //获取随机时间数
                let randomTime = this.getRandomFloat(this.rIspawnMinTime, this.rIspawnMaxTime);
                this.RItimer = this.scheduleOnce(() => {       //计时器
                                   this.randomTimeSpawn();     //递归调用自身
                                   this.spawnRandomItem();     //生成物品
                                   this.RITotalAmount++;       //场景物品数+1
                               }, randomTime);                 //随机时间
            }
        }
    }

    //随机废品生成
    spawnRandomItem() {
        //赋予物品id：|[0]=可回收 | [1]=有害 |[2]=干 | [3]=湿 |
        let items = [this.rIRec, this.rIHar, this.rIDry, this.rIWet];
        let selectRI = items[Math.floor(Math.random() * items.length)]; //随机选择一个预制体
        let RI = instantiate(selectRI);
        //给其设置随机设置高度
        let randomHeight = this.getRandomInt(this.rIspawnMinHeight, this.rIspawnMaxHeight);
        RI.setPosition(600, randomHeight);      //设置生成位置
        this.randomItemNode.addChild(RI);       //添加到父节点进行生成
    }

    //废品移动(update)
    ItemMove(dt) {
        for (let item of this.randomItemNode.children) {
            let pos = item.position.clone();
            pos.x += this.rImoveSpeed;
            item.position = pos;
            //废品出界监测
            if (item.position.x < -450) {
                item.destroy();
                this.RITotalAmount--;          //场景物品数-1
            }
        }
    }

    //玩家拾取废品总运行器(update) [其中设置了预制体Tag：| Rec=5 | Har=6 | Dry=7 | Wet = 8]
    pickItem() {
        this.getItemPrefabCollider(this.randomItemNode);                    //获取随机废品子节点的碰撞箱
        this.itemColliderStorer.forEach(collider => {
            if (this.colliderCheck(this.playerNode, collider.node)) {       //玩家拾取废品监测
                let posX = collider.node.position.x;
                let posY = collider.node.position.y;
                this.itemGetParticle.setPosition(new Vec3(posX + 360, posY + 140, 0));  //将粒子的位置生成在拾取处
                let itemTag = collider.node.getComponent(Collider2D).tag;   //获取碰撞箱Tag
                switch (itemTag) {              //tag比对检测
                    case 5:
                        if (!this.isGameOver) this.getRecs += 1;
                        collider.node.destroy();
                        this.getItemPlayer();
                        this.RITotalAmount--;          //场景物品数-1
                        break;
                    case 6:
                        if (!this.isGameOver) this.getHars += 1;
                        collider.node.destroy();
                        this.getItemPlayer();
                        this.RITotalAmount--;          //场景物品数-1
                        break;
                    case 7:
                        if (!this.isGameOver) this.getDrys += 1;
                        collider.node.destroy();
                        this.getItemPlayer();
                        this.RITotalAmount--;          //场景物品数-1
                        break;
                    case 8:
                        if (!this.isGameOver) this.getWets += 1;
                        collider.node.destroy();
                        this.getItemPlayer();
                        this.RITotalAmount--;          //场景物品数-1
                        break;
                }
            }
        });
    }

    //拾取废品粒子音声 & 分数处理
    getItemPlayer() {
        this.itemGetA.play();        //播放音效
        this.itemGetP.resetSystem(); //播放粒子
        //游戏未结束时拾取物品加分
        if (!this.isGameOver) this.score += this.itemIncrScore;
    }

    //玩家拾取废品碰撞判断逻辑
    colliderCheck(slime: Node, item: Node): boolean {
        let slimeCollider = slime.getComponent(Collider2D);
        let itemCollider = item.getComponent(Collider2D);
        //检测是否相交，若相交则返回true
        return slimeCollider.worldAABB.intersects(itemCollider.worldAABB);
    }

    //获取废品总节点下所有预制体的碰撞箱属性
    getItemPrefabCollider(parent: Node) {
        this.itemColliderStorer = [];
        parent.children.forEach(child => {
            let collider = child.getComponent(Collider2D);
            if (collider) {
                this.itemColliderStorer.push(collider);
            }
        });
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //游戏道具生成

    @property({ type: Node })               //道具父节点
    private PropGroupNode: Node = null;
    @property({ type: Prefab })
    private invinciblePropPrefab: Prefab = null;    //无敌道具预制体
    @property({ type: Node })               //无敌UI节点
    private invincibleUINode: Node = null;  

    private invincibleBreakBlockIncrScore: number = 25; //无敌状态破坏方块时的得分
    private IPincrScore: number = 2;                    //无敌状态下每0.2秒获得的分数
    private IPincrTime: number = 7;                     //获取无敌道具时获得的奖励时间(s)
    private invincibleEffectTime: number = 0;           //无敌效果时间
    private IPcontinueTime: number = 7;                 //无敌状态持续时间(s)

    private isAllowIPspawn: boolean = false;            //是否允许无敌道具生成
    private isIPexist: boolean = false;                 //无敌道具是否存在
    private isPlayerGettingIPeffect: boolean = false;   //玩家是否正处于无敌道具效果中
    
    private propSpawnLimitTime: number = 0;     //允许道具生成时间阈值(用于保证几秒之前不刷新出无敌道具)

    private propIPspawnMinTime: number = 13.0;   //无敌道具生成的最小时间(s)
    private propIPspawnMaxTime: number = 18.0;   //无敌道具生成的最大时间(s)
    private propIPspawnTimer: any = null;        //无敌道具生成计时器
    private propIPparticleTimer: any = null;     //无敌道具粒子计时器

    private propIPspawnMinHeight: number = 550;  //生成无敌道具的最低高度
    private propIPspawnMaxHeight: number = 1250; //生成无敌道具的最高高度

    private propIPbounceMinSpeed: number = 39;   //无敌道具最低弹跳Y轴线性速度
    private propIPbounceMaxSpeed: number = 47;   //无敌道具最高弹跳Y轴线性速度


    //无敌道具生成确认(update)
    confirmIPspawn() {
        if (this.propSpawnLimitTime > 5 && !this.isAllowIPspawn) {
            this.isAllowIPspawn = true;
        }
    }

    //随机时间范围内生成无敌道具(递归)(设定到与垃圾一起生成)
    invinciblePropSpawn() {
        if (this.isAllowIPspawn && !this.isIPexist) {
            let randomTime = this.getRandomFloat(this.propIPspawnMinTime, this.propIPspawnMaxTime)   //获取随机数时间
            this.isIPexist = true;              //设置无敌道具为存在，延长间隔生成时间

            this.propIPspawnTimer = this.scheduleOnce(() => {
                                        this.invinciblePropSpawn();     //递归调用自身
                                        this.spawnInvincibleProp();     //生成无敌道具            
                                    }, randomTime);                     //随机时间内生成
        }
    }

    //生成无敌道具
    spawnInvincibleProp() {
        let IP = instantiate(this.invinciblePropPrefab);    //关联预制体     
        let randomHeight = this.getRandomInt(this.propIPspawnMinHeight, this.propIPspawnMaxHeight); //获取随机设置高度
        IP.setPosition(400, randomHeight);      //设置生成位置
        this.PropGroupNode.addChild(IP);       //添加到父节点进行生成
    }

    //无敌道具落地监测(update)
    invinciblePropFalledCheck() {
        if (this.isAllowIPspawn) {
            for (let IP of this.PropGroupNode.children) {       //获取无敌道具节点
                let Rigid = IP.getComponent(RigidBody2D)        //获取无敌道具刚体属性
                if (IP.position.y < -370) {
                    let randomSpeed = this.getRandomInt(this.propIPbounceMinSpeed, this.propIPbounceMaxSpeed);   //随机化弹跳高度
                    Rigid.linearVelocity = new Vec2(-14, randomSpeed);                 //落地时提供水平方向加速度和随机的垂直加速度
                }
            }
        }
    }

    //玩家拾取无敌道具碰撞判断逻辑
    playerGetIPcheck(slime: Node, prop: Node): boolean {
        let slimeCollider = slime.getComponent(Collider2D);
        let propCollider = prop.getComponent(Collider2D);
        //检测是否相交，若相交则返回true
        return slimeCollider.worldAABB.intersects(propCollider.worldAABB);
    }

    //拾取无敌道具监测(update)
    pickInvincibleProp() {
        for (let IP of this.PropGroupNode.children) {           //获取无敌道具节点
            if (this.playerGetIPcheck(this.playerNode, IP)) {   //监测到拾取时，执行
                this.invincibleUINode.active = true; //显示无敌UI
                this.isIPexist = false;              //无敌道具存在状态改变为不存在
                IP.destroy();                        //摧毁节点
                this.playerInvincibleEffect();       //执行无敌道具状态
            }
        }
    }

    //无敌道具状态（计分方式链接到计时器中）
    playerInvincibleEffect() {
        this.invinciblePlayer();                //播放音声与粒子
        this.isPlayerGettingIPeffect = true;    //改变为获取无敌状态效果中
        this.isInvincible = true;               //改变玩家为无敌
        this.invincibleEffectTime += this.IPcontinueTime;  //无敌时间增加
        if (!this.isGameOver) this.showingTime += this.IPincrTime;  //获得奖励时间(游戏未结束的前提下)
    }

    //玩家无敌效果粒子与音声播放器
    invinciblePlayer() {
        let sound = this.invincibleEffectParticle.getComponent(AudioSource);       
        sound.play();           //播放音声
        //循环播放粒子
        this.invincibleP.resetSystem();
        this.propIPparticleTimer = this.schedule(this.IPparticlePlay, 1.0, macro.REPEAT_FOREVER);
    }

    //无敌粒子播放
    IPparticlePlay() {
        //处于无敌状态时播放
        if (this.isInvincible) {
                this.invincibleP.resetSystem();
        }
    }

    //设置无敌状态粒子生成位置(update)
    setInvincibleParticlePos() {
        //设置释放粒子位置
        this.invincibleEffectParticle.setPosition(new Vec3(this.playerNode.position.x + 360, this.playerNode.position.y + 640, 0));  
    }

    //无敌效果结束监测(update)
    checkInvincibleEffectOver() {
        //处于无敌状态时执行监测
        if (this.isPlayerGettingIPeffect) {
            //监测到无敌时间结束时
            if (this.invincibleEffectTime <= 0) {   
                this.isPlayerGettingIPeffect = false;       //关闭获取无敌状态效果中
                this.isInvincible = false;                  //关闭无敌状态
                this.invincibleUINode.active = false;       //关闭无敌UI

                this.invincibleP.stopSystem();              //关闭粒子
                this.unschedule(this.IPparticlePlay);       //清除无敌效果计时器
            }
        }
    }

    //道具出界检测(update)
    PropOutCheck() {
        //获取道具组所有子节点
        for (let prop of this.PropGroupNode.children) {   
            if (prop.position.x < -450 || prop.position.y < -500) {
                prop.destroy();         //销毁粒子节点
                this.isIPexist = false; //更改无敌道具存在状态为不存在
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(方块生成)

    @property({ type: Node })               //随机伤害方块生成节点
    private randomBlockNode: Node = null;
    @property({ type: Prefab })             //预制体01
    private blockPrefab01: Prefab = null;
    @property({ type: Prefab })             //预制体02
    private blockPrefab02: Prefab = null;
    @property({ type: Prefab })             //预制体03
    private blockPrefab03: Prefab = null;

    @property({ type: Node })
    private hitBlockParticle: Node = null;  //方块摧毁粒子节点

    private blockColliderStorer: Collider2D[] = [];       //存储所有预制体方块的碰撞箱

    private blockMoveSpeed: number = -450;           //方块的速度（固定）
    private blockSpawnMinHeight: number = 0;         //生成方块的最低高度
    private blockSpawnMaxHeight: number = 700;       //生成方块的最大高度
    private RBTotalAmount: number = 0;               //场景中方块总数
    private MaxRBAmount: number = 3;                 //场景中允许存在的最大方块数量

    private blockSpawnMinTime: number = 2.5;         //生成方块的最小间隔时间(s)
    private blockSpawnMaxTime: number = 5.0;         //生成方块的最大间隔时间(s)
    private isStartBlockSpawn: boolean = false;      //启用随机时间范围生成逻辑判断值
    private RBTimer: any = null;                     //随机方块生成定时器


    //随机时间生成方块事件确认
    confirmRandomBlockSpawn() {
        if (!this.isStartBlockSpawn) {
            this.isStartBlockSpawn = true;
            this.randomTimeBlockSpawn();
        }
    }

    //随机时间范围中循环生成方块
    randomTimeBlockSpawn() {
        if (this.isStartBlockSpawn) {
            //场景内存在方块数小于限制数量时，随机生成方块
            if (this.RBTotalAmount < this.MaxRBAmount) {
                this.spawnRandomBlock();    //生成方块
                this.RBTotalAmount++;       //场景内方块数量+1
            }        
            let randomTime = this.getRandomFloat(this.blockSpawnMinTime, this.blockSpawnMaxTime);     //获取一个随机时间
            this.RBTimer = this.scheduleOnce(() => {
                this.randomTimeBlockSpawn();     //递归调用自身
            }, randomTime);                      //随机时间
        }
    }

    //随机方块体生成
    spawnRandomBlock() {
        //赋予墙体id
        let blocks = [this.blockPrefab01, this.blockPrefab02, this.blockPrefab03];

        let selectRB = blocks[Math.floor(Math.random() * blocks.length)]; //随机选择一个预制体
        let RB = instantiate(selectRB);         //创建

        //随机设置高度
        let randomHeight = this.getRandomInt(this.blockSpawnMinHeight, this.blockSpawnMaxHeight);

        RB.setPosition(800, randomHeight);      //设置生成位置（高度随机）
        this.randomBlockNode.addChild(RB);      //添加到父节点进行生成

    }

    //方块移动(update)
    BlockMove(dt) {
        let speed = this.blockMoveSpeed * dt;

        for (let block of this.randomBlockNode.children) {
            let pos = block.position.clone();
            pos.x += speed;
            block.position = pos;
            //方块出界监测
            if (block.position.x < -450) {
                block.destroy();        //销毁节点
                this.RBTotalAmount--;   //方块数量-1
            }
        }
    }

    //玩家碰撞方块总运行器(update)
    HitBlock() {
        this.getBlockPrefabCollider(this.randomBlockNode);                      //获取随机方块子节点的碰撞箱
        this.blockColliderStorer.forEach(collider => {
            if (this.blockColliderCheck(this.playerNode, collider.node)) {      //玩家碰撞监测
                let posX1 = collider.node.position.x;
                let posY1 = collider.node.position.y;
                this.hitBlockParticle.setPosition(new Vec3(posX1 + 360, posY1 + 140, 0));   //将粒子的位置生成在碰撞处
                //若处于无敌状态
                if (this.isInvincible) {              
                    this.invincibleHitBlockPlayer();  //无敌状态方块碰撞播放器
                    collider.node.destroy();          //摧毁节点
                    this.RBTotalAmount--;             //场景内方块数量-1
                    //分数增加
                    if (!this.isGameOver) this.score += this.invincibleBreakBlockIncrScore;       
                }
                //否则默认状态
                else {
                    this.hitBlockPlayer();           //方块碰撞播放器
                    this.health--;                   //减少1点生命
                    collider.node.destroy();         //摧毁节点
                    this.RBTotalAmount--;            //场景内方块数量-1
                }
            }
        });
    }

    //角色碰撞方块粒子与音声播放器
    hitBlockPlayer() {
        this.blockA.play();
        this.blockP.resetSystem();
    }

    //无敌状态角色碰撞方块粒子与音声播放器
    invincibleHitBlockPlayer() {
        this.invincibleA.play();
        this.blockP.resetSystem();       
    }

    //玩家碰撞墙体判断逻辑
    blockColliderCheck(slime: Node, block: Node): boolean {
        let slimeCollider = slime.getComponent(Collider2D);
        let blockCollider = block.getComponent(Collider2D);

        //检测是否相交，若相交则返回true
        return slimeCollider.worldAABB.intersects(blockCollider.worldAABB);
    }

    //获取废品总节点下所有预制体的碰撞箱属性
    getBlockPrefabCollider(parent: Node) {
        this.blockColliderStorer = [];
        parent.children.forEach(child => {
            let collider = child.getComponent(Collider2D);
            if (collider) {
                this.blockColliderStorer.push(collider);
            }
        });
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(地面与背景逻辑)

    @property({ type: Node })                  //地面节点绑定
    private groundNode: Node = null;
    private groundMoveSpeed: number = -500;    //地面移动速度(向量)

    @property({ type: Node })                  //背景图片节点
    private backgroundNode: Node = null;
    private bgSpeed: number = -150;            //背景图片移动速度


    //地面移动(update)
    groundMove(dt) {
        let speed = this.groundMoveSpeed * dt;
        this.groundNode.setPosition(this.groundNode.position.add(new Vec3(speed, 0, 0)));
        //移动时持续监测位置
        if (this.groundNode.position.x < -495) {
            this.groundNode.setPosition(this.groundNode.position.add(new Vec3(495, 0, 0)));
        }
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

    //游戏音频播放
    audioPlayer() {
        let music = this.canvasNode.getComponent(AudioSource);
        music.play();
        music.volume = 0.1;
        tween(this.canvasNode.getComponent(AudioSource))
            .to(2.4, { volume: 0.5 })
            .start();
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(点击按钮事件函数clickEvent)

    @property({ type: AudioSource })        //按钮点击音效
    private buttonClickSound: AudioSource = null;
    @property({ type: Node })               //开局帮助确认按钮节点
    private hintConfirmNode: Node = null;
    @property({ type: Node })               //暂停游戏按钮节点
    private pauseButtonNode: Node = null;
    @property({ type: Node })               //暂停游戏菜单面板节点
    private pauseMenuBoardNode: Node = null;

    private isPausingGame: boolean = false; //是否正在暂停游戏


    //按钮点击音效
    ButtonSound() {
        this.buttonClickSound.play();
    }

    //点击开始游戏并执行相关初始化 <!>
    tapToStart() {
        this.initPlayer();     //玩家初始化
        this.hintConfirmNode.getComponent(Button).interactable = false;   //禁用按钮点击
        this.ButtonSound();    //播放按钮音效

        //1s内提示框渐隐
        tween(this.HintBoardNode.getComponent(UIOpacity))
            .to(1, { opacity: 0 })
            .start();

        //1s后播放开局倒计时
        this.scheduleOnce(() => {
            this.countShow();                   //开局倒计时
            this.HintBoardNode.active = false;  //禁用按钮
        }, 1.0);

        //开局倒计时结束后进行游戏初始化
        this.scheduleOnce(() => {
            this.startGameTimer();              //开启游戏计时
            this.initJumpBar();                 //跳跃条初始化
            this.showUI();                      //打开UI显示
            this.openTouchEvent()               //开启触摸监测
            this.countNode.active = false;      //关闭开局倒计时节点

            //开启物品与墙体刷新
            this.confirmRandomSpawn();          //运行随机时间自动生成废品逻辑
            this.confirmRandomBlockSpawn();     //运行随机时间自动生成方块逻辑
        }, 4.5);
    }

    //暂停按钮点击
    clickPauseButton() {
        this.ButtonSound();                     //播放点击音效
        this.pauseGameTimer();                  //暂停游戏计时
        this.closeTouchEvent();                 //关闭点击事件监听
        this.unschedule(this.RItimer)           //清除RI计时器
        this.unschedule(this.RBTimer)           //清除RB计时器

        this.pauseButtonNode.active = false;    //暂停按钮节点隐藏   
        this.pauseMenuBoardNode.active = true;  //暂停游戏界面显示
        this.isPausingGame = true;              //暂停游戏状态开启
        

        this.isStartBlockSpawn = false;         //停止方块刷新
        this.isStartRandomSpawn = false;        //停止废品刷新

        PhysicsSystem2D.instance.enable = false;    //暂时关闭物理系统      
    }

    //返回游戏按钮点击
    clickBackToGameButton() {
        this.ButtonSound();                      //播放点击音效
        this.startGameTimer();                   //继续游戏计时
        this.openTouchEvent();                   //开启点击事件监听

        this.pauseButtonNode.active = true;      //暂停按钮节点显示
        this.pauseMenuBoardNode.active = false;  //暂停游戏界面关闭
        this.isPausingGame = false;              //暂停游戏状态关闭

        this.confirmRandomBlockSpawn();          //启动方块刷新
        this.confirmRandomSpawn();               //启动物品刷新

        PhysicsSystem2D.instance.enable = true;    //恢复物理系统
    }

    //结束收集按钮点击
    clickEndCollectingButton() {
        this.ButtonSound();                      //播放点击音效
        this.gameOver();                         //结束游戏

        this.pauseMenuBoardNode.active = false;  //暂停游戏界面关闭
        this.isPausingGame = false;              //暂停游戏状态关闭

        PhysicsSystem2D.instance.enable = true;    //恢复物理系统
    }

    //查看攻略按钮点击
    clickCheckTheGuideButton() {
        this.ButtonSound();                      //播放点击音效

        this.pauseMenuBoardNode.active = false;  //暂停游戏界面关闭
        this.TipBorad.active = true;             //游戏帮助界面开启
        this.tipBorad1.active = true;            //打开第一页
    }

    //返回标题按钮点击
    clickBackToTitleButton() {
        this.ButtonSound();                 //播放点击音效
        director.loadScene("menu");         //加载标题界面
        PhysicsSystem2D.instance.enable = true;    //恢复物理系统
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
        this.ButtonSound();                     //播放点击音效
        this.tipBorad1.active = false;          //第一页隐藏
        this.tipBorad2.active = true;           //第二页开启
    }
    //第二页返回
    P2backButton() {
        this.ButtonSound();                     //播放点击音效
        this.tipBorad2.active = false;          //第二页隐藏
        this.tipBorad1.active = true;           //第一页开启
    }
    //第二页翻页
    P2nextButton() {
        this.ButtonSound();                     //播放点击音效
        this.tipBorad2.active = false;          //第二页隐藏
        this.tipBorad3.active = true;           //第三页开启
    }
    //第三页返回
    P3backButton() {
        this.ButtonSound();                     //播放点击音效
        this.tipBorad3.active = false;          //第三页隐藏
        this.tipBorad2.active = true;           //第二页开启
    }
    //第三页翻页
    P3nextButton() {
        this.ButtonSound();                     //播放点击音效
        this.tipBorad3.active = false;          //第三页隐藏
        this.tipBorad4.active = true;           //第四页开启
    }
    //第四页返回
    P4backButton() {
        this.ButtonSound();                     //播放点击音效
        this.tipBorad4.active = false;          //第四页隐藏
        this.tipBorad3.active = true;           //第三页开启
    }
    //确定按钮
    ClickConfirmButton() {
        this.ButtonSound();                     //播放点击音效
        this.TipBorad.active = false;           //帮助页面隐藏
        this.tipBorad1.active = true;           //第一页开启
        this.tipBorad2.active = true;           //第二页开启
        this.tipBorad3.active = true;           //第三页开启
        this.tipBorad4.active = true;           //第四页开启
        this.pauseMenuBoardNode.active = true;  //暂停游戏界面开启
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(游戏结束相关)

    @property({ type: Node })               //游戏结束节点
    private gameOverNode: Node = null;

    private isGameOver: boolean = false;    //是否已结束游戏


    //游戏结束处理
    gameOver() {
        this.gameOverAnimation();           //播放游戏结束动画             
        this.isGameOver = true;             //更改游戏状态为结束
        this.isStartRandomSpawn = false;    //停止随机物体生成
        this.isStartBlockSpawn = false;     //停止随机方块生成

        this.onTouchEnd();                  //强制结束抬手动作
        this.closeTouchEvent();             //清理事件监听器
        this.isRepeatPlay = false;          //粒子重复停止

        this.unschedule(this.jumpChargedRepeat);  //清除蓄力动画计时器
        this.unschedule(this.propIPspawnTimer); //清除无敌道具生成计时器
        this.unschedule(this.RItimer);          //清除RI计时器
        this.unschedule(this.RBTimer);          //清除RB计时器

        this.pauseButtonNode.getComponent(Button).interactable = false; //禁用暂停按钮交互


        //5.5s后切换到下一场景，并保存数据
        this.scheduleOnce(() => {            
            director.loadScene("questionGame");
            this.postData();                //保存重要数据
        }, 5.5);
    }

    //游戏结束动画
    gameOverAnimation() {
        this.gameOverNode.active = true;    //显示游戏结束板节点
        //播放音声与动画
        this.gameOverNode.getComponent(Animation).play("collectOver");
        this.gameOverNode.getComponent(AudioSource).play();
        //4s内音量逐渐减小
        tween(this.canvasNode.getComponent(AudioSource))
            .to(4, { volume: 0 })
            .start();
        //4s后在1.5s内逐渐使Canvas消失
        this.scheduleOnce(() => {
            tween(this.canvasNode.getComponent(UIOpacity))
                .to(1.5, { opacity: 0 })
                .start();
        }, 4.0);
    }

    //传递数据到下个场景
    postData() {
        //主要将当前场景获取的物品和分数存储
        const getItemAmount: number[] = [this.getRecs, this.getHars, this.getDrys, this.getWets];
        sys.localStorage.setItem("getAmount", JSON.stringify(getItemAmount));   //数组转为字符串存储
        sys.localStorage.setItem("score", this.score.toString());               //数字转为字符串存储
    }

}