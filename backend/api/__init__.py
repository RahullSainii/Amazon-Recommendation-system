from flask import Blueprint

api_bp = Blueprint("api", __name__)

# Import route modules so they register with the shared blueprint.
from . import auth_routes  # noqa: E402,F401
from . import ml_routes  # noqa: E402,F401
from . import product_routes  # noqa: E402,F401
from . import shopping_routes  # noqa: E402,F401
from . import user_routes  # noqa: E402,F401
