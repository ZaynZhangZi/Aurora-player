/**
 * author: zijun
 * @description: 用户接口
 */
import apiClient from "@/axios/apiClient";

export const userApi={
    //二维码 key 生成接口
    getQrKey(){
        return apiClient.get('/login/qr/key', {
            params: {
                noCookie: true,
            },
        })
    },

    //生成二维码图片
    getQrCode(key){
        return apiClient.get('/login/qr/create', {
            params: {
                key,
                qrimg: true,
                noCookie: true,
            },
        })
    },

    //二维码检测扫码状态接口
    checkQrCode(key, {noCookie = true} = {}){
        return apiClient.get('/login/qr/check', {
            params: {
                key,
                ...(noCookie ? {noCookie: true} : {}),
            },
        })
    },

    //获取账号信息
    getUserInfo(){
        return apiClient.get('/user/account')
    },

    //获取账号信息（别名）
    getAccountInfo() {
        return apiClient.get('/user/account')
    },

    //获取用户详情
    getUserDetail(uid){
        return apiClient.get(`/user/detail?uid=${uid}`)
    },

    //获取用户信息 , 歌单，收藏，mv, dj 数量
    getUserSubCount(){
        return apiClient.get('/user/subcount')
    },

    //获取用户等级信息
    getUserLevel(){
        return apiClient.get('/user/level')
    },

    //获取用户绑定信息
    getUserBinding() {
        return apiClient.get('/user/binding')
    },

    //用户绑定手机
    bindCellphone(phone, captcha, oldcaptcha = '', countrycode = '86') {
        return apiClient.post('/user/bindingcellphone', null, {
            params: {
                phone,
                captcha,
                oldcaptcha,
                countrycode,
            },
        })
    },

    //更新用户信息
    updateUserProfile({
        gender,
        birthday,
        nickname,
        province,
        city,
        signature,
    } = {}) {
        return apiClient.post('/user/update', null, {
            params: {
                gender,
                birthday,
                nickname,
                province,
                city,
                signature,
            },
        })
    },

    //更新头像
    uploadAvatar(imgFile, imgSize = 300) {
        const formData = new FormData()
        formData.append('imgFile', imgFile)
        return apiClient.post('/avatar/upload', formData, {
            params: {
                imgSize,
            },
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    },

    //国家编码列表
    getCountriesCodeList() {
        return apiClient.get('/countries/code/list')
    },

    getUserPlaylist(uid, limit = 20, offset = 0){
        return apiClient.get(`/user/playlist?uid=${uid}&limit=${limit}&offset=${offset}`)
    },

    //私信和通知接口 - 通知
    getNotices(limit = 30, lasttime = -1) {
        return apiClient.get('/msg/notices', {
            params: {
                limit,
                lasttime,
            },
        })
    },

    //私信和通知接口 - 私信列表
    getPrivateMessages(limit = 30, offset = 0) {
        return apiClient.get('/msg/private', {
            params: {
                limit,
                offset,
            },
        })
    },

    //私信和通知接口 - 私信历史
    getPrivateHistory(uid, limit = 30, before = 0) {
        return apiClient.get('/msg/private/history', {
            params: {
                uid,
                limit,
                before,
            },
        })
    },

    //私信和通知接口 - 通知评论
    getMsgComments(uid, before = 0, limit = 30) {
        return apiClient.get('/msg/comments', {
            params: {
                uid,
                before,
                limit,
            },
        })
    },

    sendPrivateMessage(userIds, msg) {
        return apiClient.post('/send/text', null, {
            params: {
                user_ids: userIds,
                msg,
            },
        })
    },

    //获取用户历史评论
    getUserCommentHistory(uid, limit = 20, before = 0) {
        return apiClient.get('/user/comment/history', {
            params: {
                uid,
                limit,
                before,
            },
        })
    },

    //获取用户电台
    getUserDj(uid, limit = 30, offset = 0) {
        return apiClient.get('/user/dj', {
            params: {
                uid,
                limit,
                offset,
            },
        })
    },

    //获取用户关注列表
    getUserFollows(uid, limit = 30, offset = 0) {
        return apiClient.get('/user/follows', {
            params: {
                uid,
                limit,
                offset,
            },
        })
    },

    //获取用户粉丝列表
    getUserFolloweds(uid, limit = 30, lasttime = -1) {
        return apiClient.get('/user/followeds', {
            params: {
                uid,
                limit,
                lasttime,
            },
        })
    },

    //获取用户动态
    getUserEvent(uid, limit = 30, lasttime = -1) {
        return apiClient.get('/user/event', {
            params: {
                uid,
                limit,
                lasttime,
            },
        })
    },

    //转发用户动态
    forwardUserEvent(evId, forwards, uid = null) {
        return apiClient.post('/event/forward', null, {
            params: {
                evId,
                forwards,
                ...(uid ? {uid} : {}),
            },
        })
    },

    //删除用户动态
    deleteUserEvent(evId) {
        return apiClient.post('/event/del', null, {
            params: {
                evId,
            },
        })
    },

    //分享文本、歌曲、歌单、mv、电台、电台节目到动态
    // type: noresource/song/playlist/mv/djprogram/djradio
    shareResource(type = 'noresource', msg = '', id = null) {
        return apiClient.post('/share/resource', null, {
            params: {
                type,
                msg,
                ...(id ? {id} : {}),
            },
        })
    },

    //获取动态评论
    getEventComments(threadId, id, limit = 20, offset = 0, before = 0) {
        return apiClient.get('/comment/event', {
            params: {
                threadId,
                id,
                limit,
                offset,
                before,
            },
        })
    },

    //关注/取消关注用户 t=1 关注 t=0 取消关注
    followUser(id, t = 1) {
        return apiClient.get('/follow', {
            params: {
                id,
                t,
            },
        })
    },

    //获取用户播放记录 type=1 周排行 type=0 全部时间
    getUserRecord(uid, type = 0) {
        return apiClient.get('/user/record', {
            params: {
                uid,
                type,
            },
        })
    },

    //获取热门话题
    getHotTopics(limit = 20, offset = 0) {
        return apiClient.get('/hot/topic', {
            params: {
                limit,
                offset,
            },
        })
    },

    //云盘
    getUserCloud(limit = 30, offset = 0) {
        return apiClient.get('/user/cloud', {
            params: {
                limit,
                offset,
            },
        })
    },

    //云盘数据详情
    getUserCloudDetail(id) {
        return apiClient.get('/user/cloud/detail', {
            params: {
                id,
            },
        })
    },

    //云盘歌曲删除
    deleteUserCloudSong(id) {
        return apiClient.post('/user/cloud/del', null, {
            params: {
                id,
            },
        })
    },

    //云盘上传
    uploadCloudSong(songFile) {
        const formData = new FormData()
        formData.append('songFile', songFile)
        return apiClient.post('/cloud', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    },

    //云盘歌曲信息匹配纠正
    correctCloudSongMatch(uid, sid, asid) {
        return apiClient.post('/cloud/match', null, {
            params: {
                uid,
                sid,
                asid,
            },
        })
    },

    //获取话题详情
    getTopicDetail(actid) {
        return apiClient.get('/topic/detail', {
            params: {
                actid,
            },
        })
    },

    //获取话题详情热门动态
    getTopicDetailHotEvents(actid) {
        return apiClient.get('/topic/detail/event/hot', {
            params: {
                actid,
            },
        })
    },

    logout() {
        return apiClient.get('/logout')
    },
}
