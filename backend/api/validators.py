from flask import jsonify, request


def json_body():
    return request.get_json(silent=True) or {}


def bounded_int_arg(name, default, minimum=1, maximum=None):
    try:
        value = int(request.args.get(name, default))
    except (TypeError, ValueError):
        value = default
    value = max(minimum, value)
    if maximum is not None:
        value = min(maximum, value)
    return value


def required_fields(data, *fields):
    missing = [field for field in fields if not data.get(field)]
    return missing


def error_response(message, status=400, **extra):
    payload = {"message": message}
    payload.update(extra)
    return jsonify(payload), status
