"""Helpers d'affichage — couleurs ANSI, étapes, messages."""

import sys


def _c(text: str, code: str) -> str:
    return f"\033[{code}m{text}\033[0m"


def green(t: str)  -> str: return _c(t, "0;32")
def yellow(t: str) -> str: return _c(t, "1;33")
def red(t: str)    -> str: return _c(t, "0;31")
def bold(t: str)   -> str: return _c(t, "1")


def step(title: str):
    """Affiche un titre d'étape."""
    print(f"\n{green('══')} {bold(title)}")


def ok(msg: str):
    print(f"  {green('✓')} {msg}")


def warn(msg: str):
    print(f"  {yellow('⚠')} {msg}")


def fail(msg: str, exit_code: int = 1):
    print(f"\n  {red('✗')} {msg}\n")
    sys.exit(exit_code)
