import 'babel-polyfill';
import {IndexRoute, Route, browserHistory, Router} from 'react-router';
import React from 'react';
import ReactDOM from 'react-dom';
import { Random } from 'marsdb';
import * as MarsClient from 'marsdb-sync-client/dist';
import * as MarsAccount from 'marsdb-sync-account/dist/client';
import TodoModel from './models/Todo.model';
import UsersModel from './models/Users.model';


class DDPTestComponent extends React.Component {
  state = {
    messages: ['Started'],
  };

  componentDidMount() {
    MarsClient.subscribe('loggedInUser');
    TodoModel.find({}, {sub: ['allTodos']}).observe((todos) => {
      this.setState({messages: todos});
    });
    MarsAccount.currentUser(UsersModel).observe(usr => {
      console.log(usr);
    })
  }

  handleClickHello = () => {
    MarsAccount.loginOAuth('vkontakte');
    //MarsClient.call('sayHello', Math.random());
  };

  handleInsert = () => {
    TodoModel.insert({
      text: 'Todo #' + Math.random(),
      complete: false,
    });
  };

  render() {
    const { messages } = this.state;
    return (
      <article>
        <h1>DDP messages</h1>
        <div>
          <button onClick={this.handleClickHello}>Say "Hallo"</button>
          <button onClick={this.handleInsert}>Insert</button>
        </div>
        <div>
          {messages.map((m, i) => <div key={i}>{JSON.stringify(m)}</div>)}
        </div>
      </article>
    );
  }
}


ReactDOM.render(
  <DDPTestComponent />,
  document.getElementById('root')
);
