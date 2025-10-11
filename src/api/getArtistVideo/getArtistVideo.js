/**
 * author: zijun
 * @description: 歌手视频接口
 */


import antigeneral from '../../video/Anti-General/Anti-General.mp4'
import xmy from '../../video/Xumengyuan/xmy.mp4'
import zjl from '../../video/zjl/zjl.mp4'


export default function getArtistVideo(artistname) {
    let artistname_ = artistname.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').toLowerCase();

    switch (artistname_) {
        case 'antigeneral':
            return antigeneral;
        case 'theweeknd':
            return 'https://mvod.itunes.apple.com/itunes-assets/HLSMusic211/v4/a3/49/ca/a349ca09-a0e8-5486-2523-27893505e67e/P992203961_Anull_video_gr598_sdr_3840x2160-.mp4';
        case '徐梦圆':
            return xmy
        case 'exo':
            return 'https://mvod.itunes.apple.com/itunes-assets/HLSMusic126/v4/89/f9/ff/89f9ff70-4f13-bdc3-e6f0-d5f9381abc34/P599468517_Anull_video_gr598_sdr_3840x2160-.mp4'
        case '周杰伦':
            return zjl
        default:
            return null;
    }
}
