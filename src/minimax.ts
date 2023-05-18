// https://www.youtube.com/watch?v=SLgZhpDsrfc

interface GameSystem<GameState, Action> {
  actions: (state: GameState) => Array<Action>,
  value: (state: GameState) => number, // May be an estimation, "evaluation function"
  gameOver: (state: GameState) => boolean,
  result: (state: GameState, action: Action) => GameState
  player: (state: GameState) => 'min' | 'max'
}

function Minimax<GameState, Action>(
  state: GameState, system: GameSystem<GameState, Action>): { value: number, action?: Action } {

  if (system.gameOver(state)) return {value: system.value(state)}

  const player = system.player(state);

  let value = player === 'max' ? -Infinity : Infinity
  let bestAction: Action | undefined

  for (const action of system.actions(state)) {
    const result = system.result(state, action);
    const resultValue = Minimax(result, system).value;
    value = Math[player](value, resultValue)
    if (value === resultValue) bestAction = action
  }
  return {
    value,
    action: bestAction
  }
}
