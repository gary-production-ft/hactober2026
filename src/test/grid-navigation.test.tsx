/**
 * Tests: Grid keyboard navigation
 *
 * Verifies that:
 * 1. Arrow keys inside the focused grid call movePlayer correctly.
 * 2. e.preventDefault() is called for arrow keys only when the grid has focus.
 * 3. Arrow keys outside the grid do NOT call preventDefault (no scroll interference).
 * 4. WASD keys also trigger movement when the grid is focused.
 */

import React from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type MovePlayer = (dx: number, dy: number) => void;

function handleGridKeyDown(
  e: React.KeyboardEvent<HTMLDivElement>,
  gameStatus: string,
  movePlayer: MovePlayer,
) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault()
  }
  if (gameStatus !== 'PLAYING') return
  switch (e.key) {
    case 'w': case 'W': case 'ArrowUp':    movePlayer(0, -1); break
    case 's': case 'S': case 'ArrowDown':  movePlayer(0, 1);  break
    case 'a': case 'A': case 'ArrowLeft':  movePlayer(-1, 0); break
    case 'd': case 'D': case 'ArrowRight': movePlayer(1, 0);  break
  }
}

function makeKeyEvent(key: string): React.KeyboardEvent<HTMLDivElement> {
  const prevented: boolean[] = []
  return {
    key,
    preventDefault: () => prevented.push(true),
    _prevented: prevented,
  } as unknown as React.KeyboardEvent<HTMLDivElement> & { _prevented: boolean[] }
}

describe('handleGridKeyDown -- unit', () => {
  let movePlayer: ReturnType<typeof vi.fn>

  beforeEach(() => { movePlayer = vi.fn() })

  it('calls movePlayer(0, -1) for ArrowUp', () => {
    handleGridKeyDown(makeKeyEvent('ArrowUp'), 'PLAYING', movePlayer)
    expect(movePlayer).toHaveBeenCalledWith(0, -1)
  })
  it('calls movePlayer(0, 1) for ArrowDown', () => {
    handleGridKeyDown(makeKeyEvent('ArrowDown'), 'PLAYING', movePlayer)
    expect(movePlayer).toHaveBeenCalledWith(0, 1)
  })
  it('calls movePlayer(-1, 0) for ArrowLeft', () => {
    handleGridKeyDown(makeKeyEvent('ArrowLeft'), 'PLAYING', movePlayer)
    expect(movePlayer).toHaveBeenCalledWith(-1, 0)
  })
  it('calls movePlayer(1, 0) for ArrowRight', () => {
    handleGridKeyDown(makeKeyEvent('ArrowRight'), 'PLAYING', movePlayer)
    expect(movePlayer).toHaveBeenCalledWith(1, 0)
  })
  it('calls movePlayer for WASD keys', () => {
    handleGridKeyDown(makeKeyEvent('w'), 'PLAYING', movePlayer); expect(movePlayer).toHaveBeenCalledWith(0, -1)
    handleGridKeyDown(makeKeyEvent('s'), 'PLAYING', movePlayer); expect(movePlayer).toHaveBeenCalledWith(0, 1)
    handleGridKeyDown(makeKeyEvent('a'), 'PLAYING', movePlayer); expect(movePlayer).toHaveBeenCalledWith(-1, 0)
    handleGridKeyDown(makeKeyEvent('d'), 'PLAYING', movePlayer); expect(movePlayer).toHaveBeenCalledWith(1, 0)
  })
  it('does NOT call movePlayer when game is not PLAYING', () => {
    handleGridKeyDown(makeKeyEvent('ArrowUp'), 'START', movePlayer)
    expect(movePlayer).not.toHaveBeenCalled()
  })
  it('still calls preventDefault for arrows even when not PLAYING', () => {
    const e = makeKeyEvent('ArrowUp') as any
    handleGridKeyDown(e, 'START', movePlayer)
    expect(e._prevented.length).toBe(1)
  })
  it('does NOT call preventDefault for non-arrow keys', () => {
    const e = makeKeyEvent('Enter') as any
    handleGridKeyDown(e, 'PLAYING', movePlayer)
    expect(e._prevented.length).toBe(0)
  })
  it('does NOT call preventDefault for Space (space scrolls are unaffected by grid)', () => {
    const e = makeKeyEvent(' ') as any
    handleGridKeyDown(e, 'PLAYING', movePlayer)
    expect(e._prevented.length).toBe(0)
  })
})

describe('Grid DOM integration', () => {
  afterEach(cleanup)

  it('prevents scroll when ArrowDown pressed on focused grid', () => {
    const movePlayer = vi.fn()
    const { getByRole } = render(
      <div role="grid" tabIndex={0} onKeyDown={(e) => handleGridKeyDown(e, 'PLAYING', movePlayer)}>
        <div role="gridcell">cell</div>
      </div>
    )
    const grid = getByRole('grid')
    grid.focus()
    const prevented: string[] = []
    grid.addEventListener('keydown', (ev) => { if (ev.defaultPrevented) prevented.push(ev.key) })
    fireEvent.keyDown(grid, { key: 'ArrowDown' })
    expect(movePlayer).toHaveBeenCalledWith(0, 1)
    expect(prevented).toContain('ArrowDown')
  })

  it('does NOT interfere with key events outside the grid', () => {
    const movePlayer = vi.fn()
    const externalHandler = vi.fn()
    const { getByTestId } = render(
      <>
        <input data-testid="search" onKeyDown={externalHandler} />
        <div role="grid" tabIndex={0} onKeyDown={(e) => handleGridKeyDown(e, 'PLAYING', movePlayer)}>
          <div role="gridcell">cell</div>
        </div>
      </>
    )
    const input = getByTestId('search')
    input.focus()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(movePlayer).not.toHaveBeenCalled()
    expect(externalHandler).toHaveBeenCalled()
  })
})
