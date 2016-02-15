import React from 'react';
import * as MarsClient from 'marsdb-sync-client';
import * as MarsAccount from 'marsdb-sync-account/dist/client';
import TodoModel from '../models/Todo.model';
import UsersModel from '../models/Users.model';



export default class DDPTestComponent extends React.Component {
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
    });
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

  handleRegister = () => {
    MarsAccount.register(this.state.email, this.state.pass).then(() => {
      console.log(arguments);
    }, (err) => {
      console.log('ERROR', err);
    })
  };

  render() {
    const { messages } = this.state;
    return (
      <article>
        <h1>DDP messages</h1>
        <div>
          <input placeholder="email"
            onChange={(e) => this.setState({email: e.target.value})}
            value={this.state.email}
          />
          <input placeholder="password"
            onChange={(e) => this.setState({pass: e.target.value})}
            value={this.state.pass}
          />
          <button onClick={this.handleRegister}>Register</button>
        </div>
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
