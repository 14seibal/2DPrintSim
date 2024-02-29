from random import random


def main():
    grid = random_grid(12, 0.5)
    print('Initial State:')
    print_grid(grid)

    done = False
    while not done:
        done = step_grid(grid)

    print('Result:')
    print_grid(grid)


def random_grid(size, density):
    return [[random() < density for _ in range(size)] for _ in range(size)]


def step_grid(grid):
    n = len(grid)
    done = True

    support = [[False for _ in range(n)] for _ in range(n)]

    for j in range(n):
        support[0][j] = True

    for i in range(1, n):
        for j in range(n):
            if grid[i - 1][j]:
                support[i][j] = True
            if j > 0 and grid[i][j-1] and grid[i-1][j-1]:
                support[i][j] = True
            if j < n-1 and grid[i][j+1] and grid[i-1][j+1]:
                support[i][j] = True

    for i in range(1, n):
        for j in range(n):
            if grid[i][j] and not support[i][j]:
                grid[i-1][j] = True
                grid[i][j] = False
                done = False

    return done


def print_grid(grid):
    n = len(grid)
    for i in range(n):
        glyphs = ['\u25a0' if x else '\u25a1' for x in grid[n-i-1]]
        print(' '.join(glyphs))
    print('\n')


if __name__ == '__main__':
    main()