import { _decorator, Component, Node, Script } from 'cc';
const { ccclass, property } = _decorator;


@ccclass('wechatShare')
export class wechatShare extends Component {
   
    clickToShare() {
        wx.shareAppMessage({
            title: '这是一条分享内容',  // 分享的标题
            desc: '分享描述内容',  // 分享的描述
            path: '/pages/index/index',  // 分享的页面路径
        });
    }

}

