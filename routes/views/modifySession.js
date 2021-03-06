'use strict';

const keystone = require('keystone');
const moment = require('moment');

exports = module.exports = function(req, res) {

  const Session = keystone.list('Session');

  const view = new keystone.View(req, res);
  const locals = res.locals;

  locals.reactData.view = { weekday: 1, active: true, session: null };
  locals.reactData.view.UILanguage = locals.reactData.app.language;
  locals.reactData.view.csrf = locals.csrf_token_value;

  locals.reactData.app.view = 'modifySession';
  locals.reactData.app.selectedTab = 'settings';

  locals.additionalResources = `
<script src="/neuvontajono/scripts/jquery-2.2.4.min.js"></script>
<script src="/neuvontajono/scripts/moment.min.js"></script>
<script src="/neuvontajono/scripts/bootstrap.transitions.min.js"></script>
<script src="/neuvontajono/scripts/bootstrap-datetimepicker.min.js"></script>
<link href="/neuvontajono/styles/bootstrap-datetimepicker.min.css" rel="stylesheet">
`;

  // **********************************************************************************************

  view.on('get', function(next) {

    if (!req.params.sessionId) {
      locals.reactData.view.createNew = true;
      locals.reactData.view.courseParticipationPolicy = locals.course.participationPolicy;
      locals.reactData.view.participationPolicy = 0;
      next();
    } else {
      Session.model.findOne({ course: locals.course._id, _id: req.params.sessionId }).exec(function(err, session) {
        if (session) {
          locals.reactData.view.sessionId = session._id.toString();
          locals.reactData.view.name = session.name;
          locals.reactData.view.assistants = session.assistants;
          locals.reactData.view.location = session.location;
          locals.reactData.view.weekday = session.weekday;
          locals.reactData.view.startDate = moment(session.startDate).format('YYYY-MM-DD');
          locals.reactData.view.endDate = moment(session.endDate).format('YYYY-MM-DD');
          locals.reactData.view.startTime = session.startTime;
          locals.reactData.view.endTime = session.endTime;
          locals.reactData.view.queueOpenTime = session.queueOpenTime;
          locals.reactData.view.active = session.active === true;
          locals.reactData.view.language = session.language;
          locals.reactData.view.participationPolicy = session.participationPolicy;
          locals.reactData.view.remoteMethod = session.remoteMethod || session.location;
          locals.reactData.view.courseParticipationPolicy = locals.course.participationPolicy;
          next();
        } else {
          req.flash('error', 'alert-session-not-found');
          res.redirect('/neuvontajono/settings');
        }
      });
    }

  });

  // **********************************************************************************************

  view.on('post', { 'action': 'save' }, function(next) {

    locals.reactData.view.name = req.body.name;
    locals.reactData.view.assistants = req.body.assistants;
    locals.reactData.view.location = req.body.location || req.body.remoteMethod;
    locals.reactData.view.weekday = req.body.weekday;
    locals.reactData.view.startDate = moment(req.body.startDate, [req.body.dateFormat, 'D.M.YYYY']).format('YYYY-MM-DD');
    locals.reactData.view.endDate = moment(req.body.endDate, [req.body.dateFormat, 'D.M.YYYY']).format('YYYY-MM-DD');
    locals.reactData.view.startTime = req.body.startTime;
    locals.reactData.view.endTime = req.body.endTime;
    locals.reactData.view.queueOpenTime = req.body.queueOpenTime;
    locals.reactData.view.active = req.body.active === 'active';
    locals.reactData.view.language = req.body.language;
    locals.reactData.view.participationPolicy = +req.body.participationPolicy;
    locals.reactData.view.remoteMethod = req.body.remoteMethod;

    if ((req.body.participationPolicy === '3' || (req.body.participationPolicy === '0' && locals.course.participationPolicy === 3)) && !req.body.remoteMethod) {
      req.flash('error', 'alert-session-save-failed');
      return next();
    }

    const save = function(session, next) {

      session.name = req.body.name;
      session.weekday = req.body.weekday;
      session.location = req.body.location || req.body.remoteMethod;
      session.assistants = req.body.assistants;
      session.language = req.body.language;
      session.participationPolicy = +req.body.participationPolicy;
      session.remoteMethod = req.body.remoteMethod;

      session.startDate = moment(req.body.startDate, [req.body.dateFormat, 'D.M.YYYY']);
      session.endDate = moment(req.body.endDate, [req.body.dateFormat, 'D.M.YYYY']);
      session.startTime = moment(req.body.startTime, [req.body.timeFormat, 'H:mm']).diff(moment().startOf('day'), 'minutes');
      session.endTime = moment(req.body.endTime, [req.body.timeFormat, 'H:mm']).diff(moment().startOf('day'), 'minutes');
      session.queueOpenTime = req.body.queueOpenTime ? moment(req.body.queueOpenTime, [req.body.timeFormat, 'H:mm']).diff(moment().startOf('day'), 'minutes') : '';
      session.active = req.body.active === 'active';

      session.save(function(err) {
        if (!err) {
          req.flash('success', 'alert-session-saved');
          res.redirect('/neuvontajono/settings');

        } else {
          req.flash('error', 'alert-session-save-failed');
          next();
        }

      });
    };

    if (req.params.sessionId) {

      Session.model.findOne({ course: locals.course._id, _id: req.params.sessionId }).exec(function(err, session) {

        if (session) {
          locals.reactData.view.sessionId = req.params.sessionId;
          save(session, next);
        } else {
          locals.reactData.view.sessionId = req.params.sessionId;
          req.flash('error', 'alert-session-save-failed');
          next();
        }

      });

    } else {

      locals.reactData.view.createNew = true;
      locals.reactData.view.courseParticipationPolicy = locals.course.participationPolicy;
      const session = new Session.model({ course: locals.course._id });
      save(session, next);

    }

  });

  // **********************************************************************************************

  view.render('reactView', locals);

};
