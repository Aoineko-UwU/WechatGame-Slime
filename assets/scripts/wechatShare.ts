import { _decorator, Component, Node, Script } from 'cc';
const { ccclass, property } = _decorator;


@ccclass('wechatShare')
export class wechatShare extends Component {
   
    clickToShare() {
        wx.shareAppMessage({
            title: '����һ����������',  // ����ı���
            desc: '������������',  // ���������
            path: '/pages/index/index',  // �����ҳ��·��
        });
    }

}

