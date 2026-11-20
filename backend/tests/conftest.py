"""Session-wide isolation from a developer's local environment file.

``app.main`` builds its application at import time, and ``Settings`` reads
``backend/.env`` when it exists. Without this file, a developer whose ``.env``
sets ``PROVIDER_MODE=live`` changes how the suite's shared ``app`` is built:
seven test modules fail at collection, because importing them validates a live
configuration that no test asked for. The suite must mean the same thing on
every machine.

Setting the environment variable here is enough because real environment
variables take precedence over ``.env``, and pytest imports ``conftest`` before
any test module imports the application. Tests that want another mode still get
one: an explicit ``Settings(provider_mode=..., _env_file=None)`` argument ranks
above the environment and is unaffected.
"""

import os

#: Demo is the only mode this build can actually serve, and the mode every
#: route test assumes. Pin it rather than inheriting a local ``.env``.
os.environ["PROVIDER_MODE"] = "demo"
