var express = require('express');
var Mock = require('mockjs');
var utils = require('../utils');
var config = require('../config');
var mongoose = require('mongoose'); 

var User = require('../models/user');
var Api = require('../models/api');
var fs = require('fs');
var markdown = require('markdown').markdown;

var router = express.Router();

function checkLogin(req) {
  return !!(req.session.userInfo || req.cookies.userInfo);
}

router.all(/mockapi(\/[^\?]*)/, function (req, res, next) {
  var filter = { url: req.params[0] };
  var method = req.method.toLowerCase() === 'get' ? '0' : '1';
  
  utils._.forEach(config.project, function(p) {
    if (p.name === req.headers.host) {
      filter.project = p.index;
    }
  });

  var keys = method === '0' ? req.query : req.body;
  var msgs = [];
  Api.findOne(filter, function (err, doc) {
    // 验证字段是否为空
    if (doc.params && doc.params.length) {
      utils._.forEach(doc.params, function(param) {
        if (param.isrequire) {
          if (param.key in keys) {
          } else {
            msgs.push(`字段 ${param.key} 为必传值`);
          }
        }
      });
    }
    if (msgs.length) {
      res.json({ status: -1, message: msgs.join('\r\n') });
      return ;
    }

    if (doc && (doc.method === '-1'|| doc.method === method)) {
      res.json({ status: 0, rs: JSON.parse(doc.responsecontent) });
    } else {
      res.json({ status: -1, message: `接口与域名不匹配, ${req.headers.host}, ${req.params[0]}, ${doc.method}, ${method}` });
    }
  });

})

/* GET home page. */
router.get('/', function(req, res, next) {
  var data = fs.readFileSync('./readme.md', 'utf8');
  var mdHTML = markdown.toHTML(data)
  res.render('index', { markdown: mdHTML});
});
router.get('/login', function(req, res, next) {
  if (checkLogin(req)) {
    var userInfo = JSON.parse(req.cookies.userInfo);
    req.session.userInfo = userInfo;
    var backurl = req.query.backurl;
    res.redirect(backurl);
    return false;
  }
  res.render('login', {
    token: utils.token.createToken({}, new Date().getTime())
  })
});

router.get('/adduser', function(req, res, next) {
  res.render('adduser');
});

router.get('/mocklist', function(req, res, next) {
  res.render('mocklist', {
    project: config.project,
    projectStr: JSON.stringify(config.project)
  });
});

router.get('/mockedit(/:id)?', function(req, res, next) {
  if (!checkLogin(req)) {
    res.redirect('/login?backurl=' + encodeURIComponent(req.secure ? 'https://' : 'http://' + req.headers.host + req.originalUrl));
    return false;
  }
  res.render('mockedit', {
    id: req.params.id,
    project: config.project,
    projectStr: JSON.stringify(config.project)
  });
});

// router.all('*', function(req, res, next) {
//   if (req.session.userInfo) {
//     next();
//   } else if (req.cookies.userInfo) {
//     var userInfo = JSON.parse(req.cookies.userInfo);

//     User.findOne({ username: userInfo.username }, function (err, user) {
//       if (!user || user.password != userInfo.password) {
//         res.redirect('/login');
//       } else {
//         req.session.userInfo = user;
//         next();
//       }
//     });
//   } else {
//     res.redirect('/login');
//   }
// });

// api
router.post('/api/login', function(req, res, next) {

  User.findOne({ username: req.body.username }, function (err, user) {
    if (!user) {
      res.json({ status: -1, message: '用户不存在' });
      return ;
    }
    //检查密码是否一致
    if (user.password != req.body.password) {
      res.json({ status: -1, message: '密码错误' });
      return ;
    }
    //用户名密码都匹配后，将用户信息存入 session
    req.session.userInfo = {
      username: user.username,
        _id: user._id
    };
    if (req.body.is_remember) {
      res.cookie('userInfo', JSON.stringify({
        username: user.username,
        _id: user._id
      }));
    }

    res.json({ status: 0 });
    
  });
});

router.get('/api/logout', function(req, res, next) {
  if (checkLogin(req)) {
    req.session.userInfo = null;
    res.clearCookie('userInfo');
    res.json({ status: 0, rs: {} });
    return ;
  }
  res.json({ status: -1, rs: '未登陆不能注销' });
});

router.post('/api/adduser', function(req, res, next) {
  var user = new User(req.body);
  if (!req.body.username || !req.body.password) {
    res.json({ status: -1, message: '用户名和密码不能为空' });
    return ;
  } 

  User.findOne({ username: user.username }, function(err, doc){
    if (!doc) {
      user.save().then(function (user) {
        if (user) {
          res.json({ status: 0, rs: user });
        }
      })
    } else {
      res.json({ status: -1, message: '添加失败，用户已存在' });
    }
  });
});

router.get('/api/getuserlist', function(req, res, next) {
  User.find({ status: 1 }).sort({'date': -1}).exec(function(err, data){
    if (err) {
      res.json({ status: -1, message: err });
    } else {
      res.json({
        status: 0,
        rs: {
          list: data
        }
      });
    }
  });
});

router.post('/api/removeuser', function(req, res, next) {
  User.remove({ _id: req.body._id }, function(err, doc){
    if (err) {
      res.json({ status: -1, message: err });
    } else {
      res.json({
        status: 0,
        rs: {}
      });
    }
  });
});

router.post('/api/addapi', function(req, res, next) {
  if (!checkLogin(req)) {
    res.json({ status: -2, message: '请先登录' });
    return ;
  }
  
  if (!req.body.desc || !req.body.url) {
    res.json({ status: -1, message: 'url , desc不能为空' });
    return;
  }

  if (!/^(\/\w+)+\/?$/g.test(req.body.url)) {
    res.json({ status: -1, message: 'url格式错误' });
    return;
  }

  var api = new Api(utils._.extend({
    url: req.body.url,
    desc: req.body.desc,
    method: req.body.method,
    project: req.body.project,
  }, {date: new Date(), lasteditor: req.session.userInfo.username, status: 1, islocked: 0}));

  
  Api.findOne({ _id: req.body.id }, function(err, doc){
    if (!doc) {
      api.save().then(function (data) {
        if (data) {
          res.json({ status: 0, rs: { id: data.id, desc: data.desc, url: data.url, project: data.project, method: data.method } });
        }
      });
    } else {
      var params = {
        url: req.body.url,
        desc: req.body.desc,
        method: req.body.method,
        project: req.body.project,
        date: new Date(),
        lasteditor: req.session.userInfo.username
      };

      Api.update({ _id: req.body.id }, utils._.extend(doc, params), function(err, info) {
        if (!err) {
          res.json({ status: 0, rs: utils._.extend(params, {id: req.body.id}) });
        } else {
          console.log(err);
          res.json({ status: -1, message: '更新失败' });
        }
      })
      
    }
  });
});

router.post('/api/updateapi', function(req, res, next) {
  if (!checkLogin(req)) {
    res.json({ status: -2, message: '请先登录' });
    return ;
  }
  
  if (!req.body.desc || !req.body.url) {
    res.json({ status: -1, message: 'url , desc不能为空' });
    return;
  }

  if (!/^(\/\w+)+\/?$/g.test(req.body.url)) {
    res.json({ status: -1, message: 'url格式错误' });
    return;
  }

  var id = req.body.id;
  var newData = {
    url: req.body.url,
    desc: req.body.desc,
    method: req.body.method,
    project: req.body.project,
  };

  Api.findById(id, function(err, oldData) {
      if (err) {
        return res.json({
          status: -1,
          message: '请确保主键Id参数正确'
        });
      }
      if (utils._.isEmpty(oldData)) {
          return res.json({
            status: -1,
            message: '没有查到原数据，无法完成修改数据'
          });
      }
      //todo 验证数据的完整性
      Api.update({ _id: id }, utils._.extend(oldData, newData), function(err, info) {
          if (err) {
              return res.json({
                status: -1,
                message: err.message
              });
          }
          return res.json({
            status: 0,
            rs: {}
          });
      })
  });
})

router.get('/api/getInfo', function(req, res, next) {
  Api.findOne({ _id: req.query.id }, function(err, doc){
    if (!doc) {
      res.json({ status: -1, message: 'api不存在' });
    } else {
      res.json({ status: 0, rs: { 
        id: doc.id, desc: doc.desc, url: doc.url, project: doc.project, method: doc.method,
        usemockjs: doc.usemockjs, responsecontent: doc.responsecontent, responsedesc: doc.responsedesc,
        params: doc.params
       } });
    }
  });
});

router.post('/api/addapirule', function(req, res, next) {
  var jsonObj;
  try {
    jsonObj = eval('(' + req.body.responsecontent + ')');
    if (jsonObj && typeof jsonObj === 'object') {

    } else {
      res.json({
        status: -1,
        message: 'json格式不正确'
      });
      return;
    }
  } catch (e) {
    res.json({
      status: -1,
      message: 'json格式不正确'
    });
    return;
  }

  var id = req.body.id;
  var newData = {
    usemockjs: req.body.usemockjs,
    responsecontent: JSON.stringify(jsonObj),
  };
  Api.findById(id, function (err, oldData) {
    var responsedesc = JSON.parse(req.body.responsedesc);
    utils._.each(responsedesc, function (reqData) {
      var flag = false;
      utils._.each(oldData.responsedesc, function (oldreqData) {
        if (reqData.key === oldreqData.key) {
          flag = true;
          oldreqData.desc = reqData.desc || '';
          return false;
        }
      });
      if (!flag) {
        oldData.responsedesc.push({
          key: reqData.key,
          desc: reqData.desc || ''
        })
      }
    });

    Api.update({ _id: id }, utils._.extend(oldData, newData), function (err, info) {
      if (err) {
        return res.json({
          status: -1,
          message: err.message
        });
      }
      return res.json({
        status: 0,
        rs: {}
      });
    });
  })
});

router.post('/api/addapiparam', function(req, res, next) {

  var id = req.body.id;
  var sid = mongoose.Types.ObjectId(new Date().getTime()); 

  Api.findById(id, function (err, oldData) {
    Api.update({ _id: id }, { $push: { params: { paramid: sid,  key: '', type: 0, desc: '' } } }, { upsert: true }, function (err, info) {
      if (err) {
        return res.json({
          status: -1,
          message: err.message
        });
      }
      return res.json({
        status: 0,
        rs: {
          id: sid
        }
      });
    });
  })
});

router.post('/api/deleteapiparam', function (req, res, next) {

  var id = req.body.id;

  Api.findById(id, function (err, oldData) {
    Api.update({ _id: id }, { $pull: { params: { paramid: req.body.paramid} } }, { upsert: true }, function (err, info) {
      if (err) {
        return res.json({
          status: -1,
          message: err.message
        });
      }
      return res.json({
        status: 0,
        rs: {
          id: req.body.paramid
        }
      });
    });
  })
});

router.post('/api/updateapiparam', function (req, res, next) {

  if (!/[a-z]([a-z]|[0-9]|_)+/g.test(req.body.key)) {
    res.json({
      status: -1,
      message: '小写，数字，英文下划线\'_\'，必须以英文字母开头'
    });
    return;
  }

  var id = req.body.id;

  Api.findById(id, function (err, oldData) {
    utils._.each(oldData.params, function (param) {
      if (param.paramid === req.body.paramid) {
        param.key = req.body.key;
        param.type = req.body.type;
        param.desc = req.body.desc;
        param.isrequire = req.body.isrequire;
      }
    });
    Api.update({ _id: id }, oldData, function (err, info) {
      if (err) {
        return res.json({
          status: -1,
          message: err.message
        });
      }
      return res.json({
        status: 0,
        rs: {}
      });
    });
  })
});

router.get('/api/getapilist', function(req, res, next) {
  var project = req.query.project;
  var status = req.query.status;
  var url = req.query.url;
  url = utils._.trim(url)
  var filter = {};
  if (~~status >= 0) {
    filter.status = status;
  }
  if (~~project >= 0) {
    filter.project = project;
  }
  if (url) {
    filter.url = new RegExp(req.query.url, 'i');
  }

  Api.find(filter).sort({ 'date': -1 }).exec(function (err, data) {
    if (err) {
      return res.json({
        status: -1,
        message: err.message
      });
    }
    return res.json({
      status: 0,
      rs: {
        list: data
      }
    });
  })
});

router.post('/api/disableapi', function(req, res, next) {
  var id = req.body.id;
  Api.findById(id, function (err, oldData) {
    Api.update({ _id: id }, utils._.extend(oldData, { status: 0 }), function (err, info) {
      if (err) {
        return res.json({
          status: -1,
          message: err.message
        });
      }
      return res.json({
        status: 0,
        rs: {}
      });
    })
  });
});

router.post('/api/apicopy', function(req, res, next) {
  
  if (!checkLogin(req)) {
    res.json({ status: -2, message: '请先登录' });
    return;
  }

  var id = req.body.id;
  Api.findById(id, function (err, oldData) {
    var api = new Api(utils._.extend({
      url: oldData.url + '_copy',
      desc: oldData.desc,
      method: oldData.method,
      project: oldData.project,

      params: oldData.params,
      usemockjs: oldData.usemockjs,
      responsecontent: oldData.responsecontent,

    }, { date: new Date(), lasteditor: req.session.userInfo.username, status: 1, islocked: 0 }));
    api.save(function (err, info) {
      if (err) {
        return res.json({
          status: -1,
          message: err.message
        });
      }
      return res.json({
        status: 0,
        rs: {}
      });
    })
  });
});

// router.get('/api/lock', function(req, res, next) {
//   res.json({ status: 200, rs: {} });
// });

// router.get('/api/unlock', function(req, res, next) {
//   res.json({ status: 200, rs: {} });
// });

// router.get('/api/changerole', function(req, res, next) {
//   res.json({ status: 200, rs: {} });
// });



module.exports = router;
