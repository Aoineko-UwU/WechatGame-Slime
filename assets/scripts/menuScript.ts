import { _decorator, Animation, AudioSource, Button, Collider2D, Component, Contact2DType, director, EPhysics2DDrawFlags, game, Game, Input, input, instantiate, macro, Node, PhysicsSystem2D, Prefab, ProgressBar, RigidBody2D, tween, UI, UIOpacity, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('gameScript')
export class gameScript extends Component {

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(预加载-类缓存变量)

    private pAnimation: Animation = null;   //角色动画组
    private pRigidBody: RigidBody2D = null; //角色刚体组

    private qUIO: UIOpacity = null;         //退出按钮不透明度组
    private sUIO: UIOpacity = null;         //开始按钮不透明度组
    private hUIO: UIOpacity = null;         //帮助按钮不透明度组

    private btnSound: AudioSource = null    //按钮音效组
    private bgm: AudioSource = null;        //背景音乐组

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //--生命周期回调函数--

    onLoad() {
        PhysicsSystem2D.instance.enable = true;                      //恢复物理系统
        director.preloadScene("collectGame")                         //预加载游戏场景
        this.pAnimation = this.playerNode.getComponent(Animation);   //加载角色动画
        this.pRigidBody = this.playerNode.getComponent(RigidBody2D); //加载角色刚体

        //加载按钮动画组
        this.sUIO = this.startNode.getComponent(UIOpacity);
        this.hUIO = this.gameHelpNode.getComponent(UIOpacity);
        this.qUIO = this.quitNode.getComponent(UIOpacity);

        this.btnSound = this.btnAudio.getComponent(AudioSource);    //加载按钮音效
        this.bgm = this.canvasNode.getComponent(AudioSource);       //加载背景音乐
    }

    start() {
        this.bgmPlayer();           //播放音乐     
        this.cameraMove();          //移动摄像机
        this.showTitleAndButton();  //展示标题与按钮

        this.playerMove();          //角色移动初始化
        this.jumpRepeat();          //角色循环跳跃

        //设置标题不透明度为0
        this.titleNode.getComponent(UIOpacity).opacity = 0;

        //禁用按钮点击,设置不透明度为0
        this.forbidButtonClick();
        this.sUIO.opacity = 0;
        this.qUIO.opacity = 0;
        this.hUIO.opacity = 0;
    }

    update(dt) {
        this.groundMove(dt);        //地面移动更新
        this.backgroundMove(dt);    //背景移动更新

        this.jumpHandler();         //跳跃落地处理
    }

    onDestroy() {
        this.unscheduleAllCallbacks();     //清除所有计时器
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(杂类代码)

    @property({ type: Node })          //画布节点(含bgm)
    private canvasNode: Node = null;

    @property({ type: Node })          //按钮音节点
    private btnAudio: Node = null;

    //主菜单音乐播放
    bgmPlayer() {
        //单次计时器设置
        this.scheduleOnce(() => {
            this.bgm.play();
            this.bgm.volume = 0.1;
            //使音乐声音逐渐变大
            tween(this.bgm)
                .to(2.5, { volume: 0.55 })
                .start();
        }, 0.3);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //(初始场景)
    @property({ type: Node })          //摄像机节点
    private cameraNode: Node = null;

    @property({ type: Node })           //标题节点
    private titleNode: Node = null;

    //摄像机移动(start)
    cameraMove() {
        //将摄像机设置到高点并逐渐移动至最初位置
        this.cameraNode.position.set(new Vec3(0, 700, 0));
        tween(this.cameraNode)
            .to(4, { position: new Vec3(0, 0, 0) })
            .start();
    }

    //标题与按钮显示计时组(start)
    showTitleAndButton() {
        this.scheduleOnce(this.titleAnimation, 2.5);
        this.scheduleOnce(this.btnAnimation, 4.0);
    }

    //标题动画
    titleAnimation() {
        //1s内显示标题
        tween(this.titleNode.getComponent(UIOpacity))
            .to(1, { opacity: 255 })
            .start();
    }

    //按钮显示动画
    btnAnimation() {
        //1s内逐渐显示按钮
        tween(this.sUIO)
            .to(1, { opacity: 255 })
            .start();

        tween(this.hUIO)
            .to(1, { opacity: 255 })
            .start();

        tween(this.qUIO)
            .to(1, { opacity: 255 })
            .start();

        //1s后允许按钮被点击
        this.scheduleOnce(() => {
            this.allowButtonClick();
        }, 1.0);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(角色状态)

    @property({ type: Node })               //玩家节点
    private playerNode: Node = null;
    private jumpSpeed: number = 60;         //角色跳跃速度基值
    private playerState: number = 0;        //角色状态【 0=移动 | 1=跳跃 】

    private isFalling: boolean = false;    //物体是否正在降落检测

    //角色移动
    playerMove() {
        this.pAnimation.getState("slimeMove").speed = 1;    //播放动画
        this.pAnimation.play("slimeMove");
    }

    //角色跳跃
    playerJump() {
        this.playerState = 1;
        this.pRigidBody.linearVelocity = new Vec2(0, this.jumpSpeed);   //给予y轴线性速度
        this.pAnimation.getState("slimeJump").speed = 1;                //播放动画
        this.pAnimation.play("slimeJump");
    }

    //角色跳跃落地碰撞检测
    jumpHandler() {
        if (this.playerState == 1) {                                         //角色状态为跳跃时执行
            let posY = this.playerNode.position.y;                           //获取Y轴方向
            //到达跳跃最高点时设为掉落状态
            if (this.pRigidBody.linearVelocity.y < 0 && !this.isFalling) {   
                this.isFalling = true;
            }
            //监测
            if (this.pRigidBody.linearVelocity.y > -0.2 && this.isFalling && posY < -450) {
                this.playerMove();
                this.playerState = 0;
                this.isFalling = false;
            }
        }
    }

    //循环跳跃
    jumpRepeat() {
        //计时器( 执行跳跃 | 每2.5s | 无限循环 | 第一次执行时延迟1s)
        this.schedule(this.playerJump, 2.5, macro.REPEAT_FOREVER,1.0)  
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(地面与背景逻辑)

    @property({ type: Node })               //地面节点绑定
    private groundNode: Node = null;
    private groundMoveSpeed: number = -500;    //地面移动速度(向量)

    @property({ type: Node })                       //背景图片节点
    private backgroundNode: Node = null;
    private bgSpeed: number = -150;                  //背景图片移动速度


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

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //(按钮事件)

    @property({ type: Node })          //开始游戏按钮
    private startNode: Node = null;
    @property({ type: Node })          //游戏帮助按钮
    private gameHelpNode: Node = null;
    @property({ type: Node })          //退出游戏按钮
    private quitNode: Node = null;

    //禁用按钮点击
    forbidButtonClick() {
        this.startNode.getComponent(Button).interactable = false;      
        this.gameHelpNode.getComponent(Button).interactable = false;   
        this.quitNode.getComponent(Button).interactable = false;      
    }
    //允许按钮点击
    allowButtonClick() {
        this.startNode.getComponent(Button).interactable = true;      
        this.gameHelpNode.getComponent(Button).interactable = true;   
        this.quitNode.getComponent(Button).interactable = true;       
    }


    //点击开始游戏(click)
    startGame() {
        this.forbidButtonClick();   //禁用按钮点击
        this.btnSound.play();       //播放按钮音效

        this.unschedule(this.playerJump);   //停止循环跳跃计时器
        this.pRigidBody.linearVelocity = new Vec2(0, -28);             //强制界面中史莱姆落地

        //0.8s后逐渐减小背景音量
        this.scheduleOnce(() => {
            tween(this.bgm)
                .to(2, { volume: 0.05 })
                .start();
        }, 0.8);

        //1s内逐渐隐藏所有UI
        tween(this.titleNode.getComponent(UIOpacity))       //标题渐隐
            .to(1, { opacity: 0 })
            .start();

        tween(this.startNode.getComponent(UIOpacity))       //开始按钮渐隐
            .to(1, { opacity: 0 })
            .start();

        tween(this.gameHelpNode.getComponent(UIOpacity))    //帮助按钮渐隐
            .to(1, { opacity: 0 })
            .start();

        tween(this.quitNode.getComponent(UIOpacity))        //结束按钮渐隐
            .to(1, { opacity: 0 })
            .start();

        //1s后主页面史莱姆向右移动
        this.scheduleOnce(() => {
            tween(this.pRigidBody)
                .to(1.5, { linearVelocity: new Vec2(25, 0) })
                .start();
        }, 1.0);

        //2.5s后Canvas总画面渐隐
        this.scheduleOnce(() => {                          
            tween(this.canvasNode.getComponent(UIOpacity))
                .to(1, { opacity: 0 })
                .start();
        }, 2.5);

        //3.5s后切换至游戏场景
        this.scheduleOnce(() => {
            director.loadScene("collectGame");  //加载场景
        }, 3.5);

    }

    //点击游戏帮助
    gameHelp() {
        this.btnSound.play();                 //播放点击音效
        this.TipBorad.active = true;          //游戏帮助界面开启
        this.tipBorad1.active = true;         //打开第一页
        //隐藏按钮节点
        this.startNode.active = false;        
        this.gameHelpNode.active = false;
        this.quitNode.active = false;
    }

    //点击退出游戏
    quitGame() {
        this.btnSound.play();       //播放点击音效
        this.forbidButtonClick();   //禁用按钮点击
        //1.5s内场景渐隐
        tween(this.canvasNode.getComponent(UIOpacity))      
            .to(1.5, { opacity: 0 })
            .start();

        //1.5s内音量减小
        tween(this.bgm)    
            .to(1.5, { volume: 0.05 })
            .start();

        //1.5s后游戏关闭
        this.scheduleOnce(() => {              
            game.end()
        }, 1.5);
    }

    ///////////////////////////////////////////////////////////////////////////////////////
    //(帮助界面)

    @property({ type: Node })              //获取总帮助父节点
    private TipBorad: Node = null;

    @property({ type: Node })              //获取第一页节点
    private tipBorad1: Node = null;
    @property({ type: Node })              //获取第二页节点
    private tipBorad2: Node = null;
    @property({ type: Node })              //获取第三页节点
    private tipBorad3: Node = null;
    @property({ type: Node })              //获取第四页节点
    private tipBorad4: Node = null;


    //第一页翻页
    P1Button() {
        this.btnSound.play();              //播放点击音效
        this.tipBorad1.active = false;     //第一页隐藏
        this.tipBorad2.active = true;      //第二页开启
    }
    //第二页返回
    P2backButton() {
        this.btnSound.play();              //播放点击音效
        this.tipBorad2.active = false;     //第二页隐藏
        this.tipBorad1.active = true;      //第一页开启
    }
    //第二页翻页
    P2nextButton() {
        this.btnSound.play();              //播放点击音效
        this.tipBorad2.active = false;     //第二页隐藏
        this.tipBorad3.active = true;      //第三页开启
    }
    //第三页返回
    P3backButton() {
        this.btnSound.play();              //播放点击音效
        this.tipBorad3.active = false;     //第三页隐藏
        this.tipBorad2.active = true;      //第二页开启
    }
    //第三页翻页
    P3nextButton() {
        this.btnSound.play();              //播放点击音效
        this.tipBorad3.active = false;     //第三页隐藏
        this.tipBorad4.active = true;      //第四页开启
    }
    //第四页返回
    P4backButton() {
        this.btnSound.play();              //播放点击音效
        this.tipBorad4.active = false;     //第四页隐藏
        this.tipBorad3.active = true;      //第三页开启
    }
    //确定按钮
    ClickConfirmButton() {
        this.btnSound.play();              //播放点击音效
        this.TipBorad.active = false;      //帮助页面隐藏
        this.tipBorad1.active = true;      //第一页开启
        this.tipBorad2.active = true;      //第二页开启
        this.tipBorad3.active = true;      //第三页开启
        this.tipBorad4.active = true;      //第四页开启
        //启用按钮
        this.startNode.active = true;     
        this.gameHelpNode.active = true
        this.quitNode.active = true;
    }

}